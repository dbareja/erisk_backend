const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const router = express.Router();
const User = require("../models/User");
const Company = require("../models/Company");
const { authenticate, JWT_SECRET, DEFAULT_CLIENT_MODULES } = require("../middleware/auth");

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, companyId: user.companyId },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// POST /api/auth/register - Register company + client user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, companyName, companyEmail, companyPhone, companyAddress } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    // Create company
    const company = new Company({
      name: companyName,
      email: companyEmail || email,
      phone: companyPhone,
      address: companyAddress,
      isApproved: false,
    });
    await company.save();

    // Create user
    const user = new User({
      name,
      email,
      password,
      role: "client",
      companyId: company._id,
      assignedModules: DEFAULT_CLIENT_MODULES,
      isApproved: false,
      isVerified: true,
      emailVerifiedAt: new Date(),
    });
    await user.save();

    company.createdBy = user._id;
    await company.save();

    res.status(201).json({
      message: "Registration successful. Please wait for Super Admin approval before login.",
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).populate("companyId");
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    if (user.role !== "superadmin") {
      if (!user.isApproved || user.companyId?.isApproved === false) {
        return res.status(403).json({ error: "Your company is pending Super Admin approval." });
      }
    }

    const token = generateToken(user);
    res.json({
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-email
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).json({ error: "Invalid verification token" });

    user.isVerified = true;
    user.emailVerifiedAt = new Date();
    user.verificationToken = undefined;
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ message: "If email exists, reset link sent." });

    user.resetPasswordToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    res.json({
      message: "Password reset token generated.",
      resetToken: user.resetPasswordToken,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ error: "Invalid or expired reset token" });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/set-password - Sub-admin sets password from invite link
router.post("/set-password", async (req, res) => {
  try {
    const { token, password, name } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ error: "Invalid or expired invite link" });

    user.password = password;
    if (name) user.name = name;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password set successfully. You can now login." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me - Get current user
router.get("/me", authenticate, async (req, res) => {
  res.json(req.user.toJSON());
});

module.exports = router;
