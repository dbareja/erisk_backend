const express = require("express");
const router = express.Router();
const AuditReport = require("../models/AuditReport");
const { authenticate, companyScope } = require("../middleware/auth");

// All routes require auth + company scoping
router.use(authenticate, companyScope);

// GET all audit reports for the scoped company
router.get("/reports", async (req, res) => {
  try {
    const filter = { ...req.companyFilter };
    // For OSA auditor/admin, also support filtering by companyId query param
    const reports = await AuditReport.find(filter)
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single audit report
router.get("/reports/:id", async (req, res) => {
  try {
    const report = await AuditReport.findOne({
      _id: req.params.id,
      ...req.companyFilter,
    }).populate("createdBy", "name email role");
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new audit report — only auditors and superadmins
router.post("/reports", async (req, res) => {
  try {
    const { role, userType } = req.user;
    // Only auditors can create audit reports
    if (role !== "auditor") {
      return res.status(403).json({ error: "Only auditors can create audit reports" });
    }

    // Determine companyId:
    // - OSA auditor/superadmin must pass companyId in body
    // - Client auditor automatically uses their companyId
    let companyId;
    if (userType === "osa") {
      companyId = req.body.companyId;
      if (!companyId) return res.status(400).json({ error: "companyId is required for OSA auditors" });
    } else {
      companyId = req.user.companyId?._id || req.user.companyId;
      if (!companyId) return res.status(400).json({ error: "No company linked to this auditor account" });
    }

    const report = new AuditReport({
      title: req.body.title,
      type: req.body.type || "Internal",
      scope: req.body.scope,
      auditDate: req.body.auditDate || new Date(),
      status: req.body.status || "Draft",
      overallCompliance: req.body.overallCompliance || "Partially Compliant",
      findings: req.body.findings || [],
      summary: req.body.summary,
      companyId,
      createdBy: req.user._id,
      createdByName: req.user.name,
    });

    await report.save();
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update audit report (auditor who created it, or superadmin)
router.put("/reports/:id", async (req, res) => {
  try {
    const report = await AuditReport.findOne({ _id: req.params.id, ...req.companyFilter });
    if (!report) return res.status(404).json({ error: "Report not found" });

    const { role } = req.user;
    if (!["auditor", "superadmin"].includes(role)) {
      return res.status(403).json({ error: "Not authorized to edit this report" });
    }

    const allowedFields = ["title", "type", "scope", "auditDate", "status", "overallCompliance", "findings", "summary"];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) report[field] = req.body[field];
    });

    await report.save();
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE audit report (superadmin only)
router.delete("/reports/:id", async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ error: "Only super admin can delete reports" });
    }
    await AuditReport.findOneAndDelete({ _id: req.params.id, ...req.companyFilter });
    res.json({ message: "Report deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
