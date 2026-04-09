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

const { sendSubAdminInviteEmail } = require("../utils/emailService");



// All admin routes require authentication + superadmin or subadmin role

router.use(authenticate);



// ========== COMPANIES ==========



// GET all companies (superadmin only)

router.get("/companies", authorize("superadmin"), async (req, res) => {

  try {

    const companies = await Company.find().populate("createdBy", "name email").sort({ createdAt: -1 });

    res.json(companies);

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});



// PATCH approve/reject company

router.patch("/companies/:id/approve", authorize("superadmin"), async (req, res) => {

  try {

    const { isApproved } = req.body;

    const company = await Company.findByIdAndUpdate(

      req.params.id,

      { isApproved },

      { new: true }

    );

    if (!company) return res.status(404).json({ error: "Company not found" });



    // Also approve/reject the associated user

    await User.updateMany(

      { companyId: company._id },

      { isApproved }

    );



    res.json({ message: `Company ${isApproved ? "approved" : "rejected"}`, company });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});



// PATCH activate/deactivate company (toggle status)

router.patch("/companies/:id/status", authorize("superadmin"), async (req, res) => {

  try {

    const { isActive } = req.body;

    const company = await Company.findByIdAndUpdate(

      req.params.id,

      { isActive, updatedAt: new Date() },

      { new: true }

    );

    if (!company) return res.status(404).json({ error: "Company not found" });

    res.json({ message: `Company ${isActive ? "activated" : "deactivated"}`, company });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});



// DELETE company

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



// GET all users (superadmin sees all, subadmin sees own company)

router.get("/users", authorize("superadmin", "subadmin"), async (req, res) => {

  try {

    let filter = {};

    if (req.user.role === "subadmin") {

      filter.companyId = req.user.companyId;

    }

    if (req.query.companyId) {

      filter.companyId = req.query.companyId;

    }

    const users = await User.find(filter).populate("companyId", "name").sort({ createdAt: -1 });

    res.json(users);

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});



// PATCH approve/reject user

router.patch("/users/:id/approve", authorize("superadmin"), async (req, res) => {

  try {

    const { isApproved } = req.body;

    const user = await User.findByIdAndUpdate(

      req.params.id,

      { isApproved },

      { new: true }

    ).populate("companyId", "name");

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: `User ${isApproved ? "approved" : "rejected"}`, user: user.toJSON() });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});



// POST create sub-admin (superadmin only) - email invite flow

router.post("/users/create-subadmin", authorize("superadmin"), async (req, res) => {

  try {

    const { email, companyId, assignedModules, userType } = req.body;



    const existing = await User.findOne({ email });

    if (existing) return res.status(400).json({ error: "Email already exists" });



    // Generate a set-password token

    const setPasswordToken = crypto.randomBytes(32).toString("hex");

    const setPasswordExpires = Date.now() + 7 * 24 * 3600000; // 7 days



    const user = new User({

      name: email.split("@")[0], // temporary name from email

      email,

      password: crypto.randomBytes(16).toString("hex"), // random placeholder password

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

    // Send email with set-password link

    const setPasswordLink = `/set-password?token=${setPasswordToken}`;

    try {

      await sendSubAdminInviteEmail(email, setPasswordLink, user.name);

      console.log(`📧 Sub-admin invite email sent to: ${email}`);

    } catch (emailErr) {

      console.error("❌ Failed to send email:", emailErr.message);

      // Continue even if email fails - user is still created

    }

    res.status(201).json({

      message: "Sub-Admin invite sent. They need to set their password.",

      user: user.toJSON(),

      setPasswordToken,

      setPasswordLink: `/set-password?token=${setPasswordToken}`,

    });

  } catch (err) {

    res.status(400).json({ error: err.message });

  }

});



// PUT update user modules

router.put("/users/:id/modules", authorize("superadmin"), async (req, res) => {

  try {

    const { assignedModules } = req.body;

    const user = await User.findByIdAndUpdate(

      req.params.id,

      { assignedModules },

      { new: true }

    );

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user.toJSON());

  } catch (err) {

    res.status(400).json({ error: err.message });

  }

});



// PUT update user role

router.put("/users/:id/role", authorize("superadmin"), async (req, res) => {

  try {

    const { role } = req.body;

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user.toJSON());

  } catch (err) {

    res.status(400).json({ error: err.message });

  }

});



// DELETE user

router.delete("/users/:id", authorize("superadmin"), async (req, res) => {

  try {

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: "User deleted" });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});



// ========== ASSETS BY COMPANY ==========

router.get("/assets", authorize("superadmin", "subadmin"), async (req, res) => {

  try {

    let filter = {};

    if (req.user.role === "subadmin") {

      filter.companyId = req.user.companyId;

    }

    if (req.query.companyId) {

      filter.companyId = req.query.companyId;

    }

    const assets = await Asset.find(filter).sort({ createdAt: -1 });

    res.json(assets);

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});



// PUT update asset from admin

router.put("/assets/:id", authorize("superadmin"), async (req, res) => {

  try {

    const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (!asset) return res.status(404).json({ error: "Asset not found" });

    res.json(asset);

  } catch (err) {

    res.status(400).json({ error: err.message });

  }

});



// DELETE asset from admin

router.delete("/assets/:id", authorize("superadmin"), async (req, res) => {

  try {

    await Asset.findByIdAndDelete(req.params.id);

    res.json({ message: "Asset deleted" });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});



// ========== RISKS BY COMPANY ==========

router.get("/risks", authorize("superadmin", "subadmin"), async (req, res) => {

  try {

    let filter = {};

    if (req.user.role === "subadmin") {

      filter.companyId = req.user.companyId;

    }

    if (req.query.companyId) {

      filter.companyId = req.query.companyId;

    }

    const risks = await Risk.find(filter).sort({ createdAt: -1 });

    res.json(risks);

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});



// PUT update risk from admin

router.put("/risks/:id", authorize("superadmin"), async (req, res) => {

  try {

    const risk = await Risk.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (!risk) return res.status(404).json({ error: "Risk not found" });

    res.json(risk);

  } catch (err) {

    res.status(400).json({ error: err.message });

  }

});



// DELETE risk from admin

router.delete("/risks/:id", authorize("superadmin"), async (req, res) => {

  try {

    await Risk.findByIdAndDelete(req.params.id);

    res.json({ message: "Risk deleted" });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});



// ========== DASHBOARD STATS (Super Admin) ==========

router.get("/stats", authorize("superadmin", "subadmin"), async (req, res) => {

  try {

    let filter = {};

    if (req.user.role === "subadmin") {

      filter.companyId = req.user.companyId;

    }



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



    res.json({

      totalCompanies,

      totalUsers,

      totalAssets,

      totalRisks,

      totalControls,

      totalTreatments,

      pendingCompanies,

      pendingUsers,

    });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});



module.exports = router;

