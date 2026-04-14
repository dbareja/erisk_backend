const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const User = require("../models/User");
const Company = require("../models/Company");
const Asset = require("../models/Asset");
const Risk = require("../models/Risk");
const Control = require("../models/Control");
const Treatment = require("../models/Treatment");
const { authenticate, authorize } = require("../middleware/auth");
const { sendSubAdminInviteEmail, sendApprovalEmail } = require("../utils/emailService");

router.use(authenticate);

// ========== COMPANIES ==========

router.get("/companies", authorize("superadmin"), async (req, res) => {
  try {
    const companies = await Company.find().populate("createdBy", "name email").sort({ createdAt: -1 });
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET pending registrations for OSA dashboard notifications
router.get("/pending-registrations", authorize("superadmin", "subadmin"), async (req, res) => {
  try {
    const pending = await Company.find({ isApproved: false })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH approve/reject company - sends approval email with login URL
router.patch("/companies/:id/approve", authorize("superadmin"), async (req, res) => {
  try {
    const { isApproved } = req.body;
    const company = await Company.findByIdAndUpdate(req.params.id, { isApproved }, { new: true });
    if (!company) return res.status(404).json({ error: "Company not found" });

    await User.updateMany({ companyId: company._id }, { isApproved });

    // Send approval email
    if (isApproved) {
      // Find the superadmin user of this company to get their email too
      const superAdmin = await User.findOne({ companyId: company._id, role: "superadmin" });
      
      // If slug missing, generate it now
      if (!company.slug) {
        const baseSlug = company.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        let slug = baseSlug;
        let counter = 1;
        while (await Company.findOne({ slug, _id: { $ne: company._id } })) {
          slug = `${baseSlug}-${counter++}`;
        }
        company.slug = slug;
        await company.save();
      }

      // Send to both company email and superadmin email
      const emailsToNotify = [...new Set([company.email, superAdmin?.email].filter(Boolean))];
      console.log(`📧 Sending approval emails to: ${emailsToNotify.join(", ")}`);
      console.log(`🔗 Login URL: ${process.env.FRONTEND_URL}/${company.slug}/login`);
      for (const email of emailsToNotify) {
        try {
          await sendApprovalEmail(email, company.name, company.slug, company.accountType || "company");
          console.log(`✅ Approval email sent to: ${email}`);
        } catch (e) {
          console.error(`❌ Approval email failed for ${email}:`, e.message);
        }
      }
    }

    res.json({ message: `Company ${isApproved ? "approved" : "rejected"}`, company });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/companies/:id/status", authorize("superadmin"), async (req, res) => {
  try {
    const { isActive } = req.body;
    const company = await Company.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
    if (!company) return res.status(404).json({ error: "Company not found" });
    res.json({ message: `Company ${isActive ? "activated" : "deactivated"}`, company });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/companies/:id", authorize("superadmin"), async (req, res) => {
  try {
    await User.deleteMany({ companyId: req.params.id });
    await Company.findByIdAndDelete(req.params.id);
    res.json({ message: "Company and associated users deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== USERS / SUB-ADMINS ==========

router.get("/users", authorize("superadmin", "subadmin"), async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === "subadmin") filter.companyId = req.user.companyId;
    if (req.query.companyId) filter.companyId = req.query.companyId;
    const users = await User.find(filter).populate("companyId", "name slug").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/users/:id/approve", authorize("superadmin"), async (req, res) => {
  try {
    const { isApproved } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isApproved }, { new: true }).populate("companyId", "name");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: `User ${isApproved ? "approved" : "rejected"}`, user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/users/create-subadmin", authorize("superadmin"), async (req, res) => {
  try {
    const { email, companyId, assignedModules, userType } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const setPasswordToken = crypto.randomBytes(32).toString("hex");
    const setPasswordExpires = Date.now() + 7 * 24 * 3600000;

    const user = new User({
      name: email.split("@")[0],
      email,
      password: crypto.randomBytes(16).toString("hex"),
      role: "subadmin",
      userType: userType || "client",
      companyId: userType === "osa" ? null : companyId,
      assignedModules: assignedModules || [],
      isApproved: true,
      isVerified: true,
      emailVerifiedAt: new Date(),
      resetPasswordToken: setPasswordToken,
      resetPasswordExpires: setPasswordExpires,
    });
    await user.save();

    const setPasswordLink = `/set-password?token=${setPasswordToken}`;
    try {
      await sendSubAdminInviteEmail(email, setPasswordLink, user.name);
    } catch (emailErr) {
      console.error("Failed to send email:", emailErr.message);
    }

    res.status(201).json({
      message: "Sub-Admin invite sent.",
      user: user.toJSON(),
      setPasswordLink,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/users/:id/modules", authorize("superadmin"), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { assignedModules: req.body.assignedModules }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user.toJSON());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/users/:id/role", authorize("superadmin"), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user.toJSON());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/users/:id", authorize("superadmin"), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ASSETS ==========

router.get("/assets", authorize("superadmin", "subadmin"), async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === "subadmin") filter.companyId = req.user.companyId;
    if (req.query.companyId) filter.companyId = req.query.companyId;
    const assets = await Asset.find(filter).sort({ createdAt: -1 });
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/assets/:id", authorize("superadmin"), async (req, res) => {
  try {
    const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!asset) return res.status(404).json({ error: "Asset not found" });
    res.json(asset);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/assets/:id", authorize("superadmin"), async (req, res) => {
  try {
    await Asset.findByIdAndDelete(req.params.id);
    res.json({ message: "Asset deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== RISKS ==========

router.get("/risks", authorize("superadmin", "subadmin"), async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === "subadmin") filter.companyId = req.user.companyId;
    if (req.query.companyId) filter.companyId = req.query.companyId;
    const risks = await Risk.find(filter).sort({ createdAt: -1 });
    res.json(risks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/risks/:id", authorize("superadmin"), async (req, res) => {
  try {
    const risk = await Risk.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!risk) return res.status(404).json({ error: "Risk not found" });
    res.json(risk);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/risks/:id", authorize("superadmin"), async (req, res) => {
  try {
    await Risk.findByIdAndDelete(req.params.id);
    res.json({ message: "Risk deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== DASHBOARD STATS ==========

router.get("/stats", authorize("superadmin", "subadmin"), async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === "subadmin") filter.companyId = req.user.companyId;

    const [totalCompanies, totalUsers, totalAssets, totalRisks, totalControls, totalTreatments, pendingCompanies, pendingUsers] =
      await Promise.all([
        Company.countDocuments(),
        User.countDocuments(filter),
        Asset.countDocuments(filter),
        Risk.countDocuments(filter),
        Control.countDocuments(filter),
        Treatment.countDocuments(filter),
        Company.countDocuments({ isApproved: false }),
        User.countDocuments({ isApproved: false, role: { $ne: "superadmin" } }),
      ]);

    res.json({ totalCompanies, totalUsers, totalAssets, totalRisks, totalControls, totalTreatments, pendingCompanies, pendingUsers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
