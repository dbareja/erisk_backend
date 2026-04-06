const express = require("express");
const router = express.Router();
const Treatment = require("../models/Treatment");
const { authenticate, companyScope, checkModule } = require("../middleware/auth");

router.use(authenticate);
router.use(checkModule("treatments"));
router.use(companyScope);

router.get("/", async (req, res) => {
  try {
    const treatments = await Treatment.find(req.companyFilter).sort({ createdAt: -1 });
    res.json(treatments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const treatment = await Treatment.findOne({ _id: req.params.id, ...req.companyFilter });
    if (!treatment) return res.status(404).json({ error: "Treatment not found" });
    res.json(treatment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.user.companyId) {
      data.companyId = req.user.companyId._id || req.user.companyId;
    }
    const treatment = new Treatment(data);
    await treatment.save();
    res.status(201).json(treatment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const treatment = await Treatment.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter },
      req.body,
      { new: true, runValidators: true }
    );
    if (!treatment) return res.status(404).json({ error: "Treatment not found" });
    res.json(treatment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const treatment = await Treatment.findOneAndDelete({ _id: req.params.id, ...req.companyFilter });
    if (!treatment) return res.status(404).json({ error: "Treatment not found" });
    res.json({ message: "Treatment deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
