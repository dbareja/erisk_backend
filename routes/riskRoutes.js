const express = require("express");
const router = express.Router();
const Risk = require("../models/Risk");
const { authenticate, companyScope, checkModule } = require("../middleware/auth");

router.use(authenticate);
router.use(checkModule("risks"));
router.use(companyScope);

router.get("/", async (req, res) => {
  try {
    console.log(`📋 GET /risks - User: ${req.user.email}, Role: ${req.user.role}, Filter:`, JSON.stringify(req.companyFilter));
    const risks = await Risk.find(req.companyFilter).sort({ createdAt: -1 });
    console.log(`📋 GET /risks - Found ${risks.length} risks`);
    res.json(risks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const risk = await Risk.findOne({ _id: req.params.id, ...req.companyFilter });
    if (!risk) return res.status(404).json({ error: "Risk not found" });
    res.json(risk);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = { ...req.body };
    const userCompanyId = req.user.companyId?._id || req.user.companyId || req.user.parentCompany;
    if (userCompanyId) {
      data.companyId = userCompanyId;
    }
    const risk = new Risk(data);
    await risk.save();
    res.status(201).json(risk);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const risk = await Risk.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter },
      req.body,
      { new: true, runValidators: true }
    );
    if (!risk) return res.status(404).json({ error: "Risk not found" });
    res.json(risk);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const risk = await Risk.findOneAndDelete({ _id: req.params.id, ...req.companyFilter });
    if (!risk) return res.status(404).json({ error: "Risk not found" });
    res.json({ message: "Risk deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
