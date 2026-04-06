const express = require("express");
const router = express.Router();
const Control = require("../models/Control");
const { authenticate, companyScope, checkModule } = require("../middleware/auth");

router.use(authenticate);
router.use(checkModule("controls"));
router.use(companyScope);

router.get("/", async (req, res) => {
  try {
    const controls = await Control.find(req.companyFilter).sort({ createdAt: -1 });
    res.json(controls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const control = await Control.findOne({ _id: req.params.id, ...req.companyFilter });
    if (!control) return res.status(404).json({ error: "Control not found" });
    res.json(control);
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
    const control = new Control(data);
    await control.save();
    res.status(201).json(control);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const control = await Control.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter },
      req.body,
      { new: true, runValidators: true }
    );
    if (!control) return res.status(404).json({ error: "Control not found" });
    res.json(control);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const control = await Control.findOneAndDelete({ _id: req.params.id, ...req.companyFilter });
    if (!control) return res.status(404).json({ error: "Control not found" });
    res.json({ message: "Control deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
