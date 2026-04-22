/**
 * Auditor Data Routes
 * Fresh, standalone API for auditors to view their company's data.
 * No dependency on companyScope middleware — resolves companyId directly.
 */

const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const User = require("../models/User");
const Risk = require("../models/Risk");
const Asset = require("../models/Asset");
const Control = require("../models/Control");
const Treatment = require("../models/Treatment");
const Config = require("../models/Config");

const JWT_SECRET = process.env.JWT_SECRET || "grc-super-secret-key-2024";

// ============ Auditor Auth Middleware (standalone) ============
const auditorAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: "User not found" });

    // Resolve company ID — raw ObjectId, no populate nonsense
    const companyId = user.companyId || user.parentCompany || null;
    if (!companyId) {
      console.error(`❌ Auditor ${user.email} has no companyId or parentCompany`);
      return res.status(400).json({ error: "No company linked to your account. Contact your administrator." });
    }

    req.auditorUser = user;
    req.auditorCompanyId = companyId;

    console.log(`🔍 Auditor API - User: ${user.email}, Role: ${user.role}, CompanyId: ${companyId}`);
    next();
  } catch (err) {
    console.error("❌ Auditor auth error:", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
};

router.use(auditorAuth);

// ============ GET /api/auditor-data/risks ============
router.get("/risks", async (req, res) => {
  try {
    const risks = await Risk.find({ companyId: req.auditorCompanyId }).sort({ createdAt: -1 });
    console.log(`📋 Auditor risks: Found ${risks.length} for company ${req.auditorCompanyId}`);
    res.json(risks);
  } catch (err) {
    console.error("❌ Auditor risks error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============ GET /api/auditor-data/assets ============
router.get("/assets", async (req, res) => {
  try {
    const assets = await Asset.find({ companyId: req.auditorCompanyId }).sort({ createdAt: -1 });
    console.log(`📦 Auditor assets: Found ${assets.length} for company ${req.auditorCompanyId}`);
    res.json(assets);
  } catch (err) {
    console.error("❌ Auditor assets error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============ GET /api/auditor-data/controls ============
router.get("/controls", async (req, res) => {
  try {
    const controls = await Control.find({ companyId: req.auditorCompanyId }).sort({ createdAt: -1 });
    console.log(`🛡️ Auditor controls: Found ${controls.length} for company ${req.auditorCompanyId}`);
    res.json(controls);
  } catch (err) {
    console.error("❌ Auditor controls error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============ GET /api/auditor-data/treatments ============
router.get("/treatments", async (req, res) => {
  try {
    const treatments = await Treatment.find({ companyId: req.auditorCompanyId }).sort({ createdAt: -1 });
    console.log(`💊 Auditor treatments: Found ${treatments.length} for company ${req.auditorCompanyId}`);
    res.json(treatments);
  } catch (err) {
    console.error("❌ Auditor treatments error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============ GET /api/auditor-data/config/:type ============
router.get("/config/:type", async (req, res) => {
  try {
    const configs = await Config.find({
      type: req.params.type,
      $or: [
        { companyId: req.auditorCompanyId },
        { companyId: { $exists: false } },
        { companyId: null },
      ],
    }).sort({ createdAt: -1 });
    res.json(configs);
  } catch (err) {
    console.error("❌ Auditor config error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============ GET /api/auditor-data/dashboard ============
router.get("/dashboard", async (req, res) => {
  try {
    const cid = req.auditorCompanyId;
    const [risks, assets, controls, treatments] = await Promise.all([
      Risk.find({ companyId: cid }),
      Asset.find({ companyId: cid }),
      Control.find({ companyId: cid }),
      Treatment.find({ companyId: cid }),
    ]);

    res.json({
      totalRisks: risks.length,
      totalAssets: assets.length,
      totalControls: controls.length,
      totalTreatments: treatments.length,
      openRisks: risks.filter(r => r.status === "Open").length,
      criticalRisks: risks.filter(r => {
        const priority = r.residualRiskPriority || r.riskPriority || "";
        return priority === "Critical" || priority === "High";
      }).length,
      mitigatedRisks: risks.filter(r => r.status === "Closed" || r.status === "Accepted").length,
      risks,
      assets,
      controls,
      treatments,
    });
  } catch (err) {
    console.error("❌ Auditor dashboard error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============ GET /api/auditor-data/debug ============
// Debug endpoint — shows exactly what the auditor's account looks like
router.get("/debug", async (req, res) => {
  try {
    const user = req.auditorUser;
    const cid = req.auditorCompanyId;

    // Count documents in each collection for this companyId
    const [riskCount, assetCount, controlCount, treatmentCount] = await Promise.all([
      Risk.countDocuments({ companyId: cid }),
      Asset.countDocuments({ companyId: cid }),
      Control.countDocuments({ companyId: cid }),
      Treatment.countDocuments({ companyId: cid }),
    ]);

    // Also count total documents (without filter) for comparison
    const [totalRisks, totalAssets] = await Promise.all([
      Risk.countDocuments({}),
      Asset.countDocuments({}),
    ]);

    res.json({
      user: {
        email: user.email,
        role: user.role,
        userType: user.userType,
        companyId: user.companyId ? user.companyId.toString() : null,
        parentCompany: user.parentCompany ? user.parentCompany.toString() : null,
        resolvedCompanyId: cid.toString(),
        isApproved: user.isApproved,
        isVerified: user.isVerified,
      },
      companyScopedCounts: {
        risks: riskCount,
        assets: assetCount,
        controls: controlCount,
        treatments: treatmentCount,
      },
      totalCounts: {
        risks: totalRisks,
        assets: totalAssets,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
