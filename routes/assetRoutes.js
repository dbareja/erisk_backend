const express = require("express");
const router = express.Router();
const Asset = require("../models/Asset");
const { authenticate, companyScope, checkModule } = require("../middleware/auth");

router.use(authenticate);
router.use(checkModule("assets"));
router.use(companyScope);

// GET all assets (company-scoped)
router.get("/", async (req, res) => {
  try {
    const assets = await Asset.find(req.companyFilter).sort({ createdAt: -1 });
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single asset
router.get("/:id", async (req, res) => {
  try {
    const asset = await Asset.findOne({ _id: req.params.id, ...req.companyFilter });
    if (!asset) return res.status(404).json({ error: "Asset not found" });
    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create asset
router.post("/", async (req, res) => {
  try {
    const data = { ...req.body };
    const userCompanyId = req.user.companyId?._id || req.user.companyId || req.user.parentCompany;
    if (userCompanyId) {
      data.companyId = userCompanyId;
    }
    const asset = new Asset(data);
    await asset.save();
    res.status(201).json(asset);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update asset
router.put("/:id", async (req, res) => {
  try {
    const asset = await Asset.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter },
      req.body,
      { new: true, runValidators: true }
    );
    if (!asset) return res.status(404).json({ error: "Asset not found" });
    res.json(asset);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE asset
router.delete("/:id", async (req, res) => {
  try {
    const asset = await Asset.findOneAndDelete({ _id: req.params.id, ...req.companyFilter });
    if (!asset) return res.status(404).json({ error: "Asset not found" });
    res.json({ message: "Asset deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
