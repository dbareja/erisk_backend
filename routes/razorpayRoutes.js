const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Razorpay = require("razorpay");
const Payment = require("../models/Payment");
const Company = require("../models/Company");
const User = require("../models/User");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/payments/create-order - Create Razorpay order
router.post("/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;

    const order = await razorpay.orders.create({ amount, currency, receipt });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/verify - Verify Razorpay payment
router.post("/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      companyEmail,
      amount,
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // Find company by email
    const company = await Company.findOne({ email: companyEmail });
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Update company payment status
    company.paymentStatus = "paid";
    company.paymentVerifiedAt = new Date();
    await company.save();

    // Find and update user
    const user = await User.findOne({ email: companyEmail });
    if (user) {
      user.paymentStatus = "paid";
      user.paymentVerifiedAt = new Date();
      await user.save();
    }

    // Create payment record
    await Payment.create({
      companyId: company._id,
      userId: user ? user._id : null,
      amount: parseInt(amount),
      currency: "INR",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      status: "completed",
      method: "razorpay",
    });

    res.json({
      success: true,
      message: "Payment verified successfully",
      company: company.name,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/status/:companyId
router.get("/status/:companyId", async (req, res) => {
  try {
    const payment = await Payment.findOne({ companyId: req.params.companyId }).sort({ createdAt: -1 });
    if (!payment) {
      return res.json({ status: "pending" });
    }
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
