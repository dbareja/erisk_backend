const express = require("express");
const router = express.Router();
const Asset = require("../models/Asset");
const Risk = require("../models/Risk");
const Control = require("../models/Control");
const Treatment = require("../models/Treatment");
const { authenticate, companyScope } = require("../middleware/auth");

router.use(authenticate);
router.use(companyScope);

router.get("/", async (req, res) => {
  try {
    const q = req.query.q || "";
    if (!q) return res.json([]);

    const regex = new RegExp(q, "i");
    const filter = { ...req.companyFilter };

    const [assets, risks, controls, treatments] = await Promise.all([
      Asset.find({ ...filter, $or: [{ name: regex }, { assetId: regex }, { type: regex }] }).limit(5),
      Risk.find({ ...filter, $or: [{ name: regex }, { riskId: regex }, { category: regex }] }).limit(5),
      Control.find({ ...filter, $or: [{ name: regex }, { controlId: regex }, { type: regex }] }).limit(5),
      Treatment.find({ ...filter, $or: [{ riskName: regex }, { treatmentId: regex }, { option: regex }] }).limit(5)
    ]);

    const results = [
      ...assets.map(a => ({ id: a._id, title: a.name, subtitle: a.assetId, type: "Asset", route: "/assets" })),
      ...risks.map(r => ({ id: r._id, title: r.name, subtitle: r.riskId, type: "Risk", route: "/risks" })),
      ...controls.map(c => ({ id: c._id, title: c.name, subtitle: c.controlId, type: "Control", route: "/controls" })),
      ...treatments.map(t => ({ id: t._id, title: t.riskName || t.treatmentId, subtitle: t.option, type: "Treatment", route: "/treatments" }))
    ];

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
