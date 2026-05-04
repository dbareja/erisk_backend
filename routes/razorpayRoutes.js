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
    console.log("🔔 RAZORPAY VERIFY API CALLED");
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      companyEmail,
      amount,
    } = req.body;

    console.log("📧 Company Email received:", companyEmail);
    console.log("💰 Amount:", amount);

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");
    
    if (expectedSignature !== razorpay_signature) {
      console.error("❌ Signature mismatch");
      return res.status(400).json({ error: "Invalid payment signature" });
    }
    console.log("✅ Signature verified");

    // Find the LATEST company by email (to avoid conflicts with older failed attempts)
    const company = await Company.findOne({ email: companyEmail }).sort({ createdAt: -1 });
    console.log("🔍 Company lookup result:", company ? company.name : "NOT FOUND");
    if (!company) {
      console.error("❌ Company not found for email:", companyEmail);
      return res.status(404).json({ error: "Company not found" });
    }

    // Update company payment status
    console.log("💾 Updating company payment status to 'paid'");
    company.paymentStatus = "paid";
    company.paymentVerifiedAt = new Date();
    await company.save();
    console.log("✅ Company updated:", company.name, "paymentStatus:", company.paymentStatus);

    // Also update the super admin user of this company
    await User.updateMany({ companyId: company._id, role: "superadmin" }, {
      paymentStatus: "paid",
      paymentVerifiedAt: new Date()
    });

    // Find and update the LATEST user
    const user = await User.findOne({ email: companyEmail }).sort({ createdAt: -1 });
    console.log("👤 User found:", user ? user.email : "NOT FOUND");
    if (user) {
      user.paymentStatus = "paid";
      user.paymentVerifiedAt = new Date();
      await user.save();
      console.log("✅ User updated");
    }

    // Create payment record
    console.log("💾 Creating payment record");
    const paymentRecord = await Payment.create({
      companyId: company._id,
      userId: user ? user._id : null,
      amount: parseInt(amount),
      currency: "INR",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      status: "completed",
      method: "razorpay",
    });
    console.log("✅ Payment record created:", paymentRecord._id);

    // Send payment confirmation email & notification (non-blocking)
    const { sendPaymentReceivedEmail } = require("../utils/emailService");
    const Notification = require("../models/Notification");
    Promise.all([
        sendPaymentReceivedEmail(company.email, company.name),
        new Notification({
          title: "Payment Received",
          message: `${company.name} has completed the registration payment.`,
          type: "payment",
          link: "/osa/superadmin/dashboard",
          companyId: company._id
        }).save()
    ]).catch(e => console.error("Payment notifications failed:", e.message));

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
