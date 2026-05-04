const express = require("express");
const router = express.Router();
const Asset = require("../models/Asset");
const Risk = require("../models/Risk");
const Control = require("../models/Control");
const Treatment = require("../models/Treatment");
const { authenticate, companyScope } = require("../middleware/auth");

router.use(authenticate);
router.use(companyScope);

const User = require("../models/User");
const Company = require("../models/Company");

router.get("/", async (req, res) => {
  try {
    const q = req.query.q || "";
    if (!q) return res.json([]);

    const regex = new RegExp(q, "i");
    const filter = req.companyFilter || {};

    const [assets, risks, controls, users, companies] = await Promise.all([
      Asset.find({ ...filter, $or: [{ name: regex }, { assetId: regex }, { type: regex }] }).limit(5),
      Risk.find({ ...filter, $or: [{ name: regex }, { riskId: regex }, { category: regex }] }).limit(5),
      Control.find({ ...filter, $or: [{ name: regex }, { controlId: regex }, { type: regex }] }).limit(5),
      User.find({ 
        ...(filter.companyId ? { companyId: filter.companyId } : {}), 
        $or: [{ name: regex }, { email: regex }] 
      }).limit(5),
      // Only OSA admins see companies in search
      req.user.userType === "osa" 
        ? Company.find({ $or: [{ name: regex }, { slug: regex }] }).limit(5)
        : Promise.resolve([])
    ]);

    const results = [
      ...assets.map(a => ({ id: a._id, title: a.name, subtitle: a.assetId, type: "Asset", route: "/osa/superadmin/resource-allocation" })),
      ...risks.map(r => ({ id: r._id, title: r.name, subtitle: r.riskId, type: "Risk", route: "/osa/superadmin/resource-allocation" })),
      ...controls.map(c => ({ id: c._id, title: c.name, subtitle: c.controlId, type: "Control", route: "/osa/superadmin/resource-allocation" })),
      ...users.map(u => ({ id: u._id, title: u.name, subtitle: u.email, type: "User", route: "/osa/superadmin/users" })),
      ...companies.map(co => ({ id: co._id, title: co.name, subtitle: co.email, type: "Company", route: "/osa/superadmin/companies" }))
    ];

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
