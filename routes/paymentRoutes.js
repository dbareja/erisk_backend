const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Company = require('../models/Company');
const User = require('../models/User');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Get all pending payments (OSA Super Admin only)
router.get('/pending', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    const pendingPayments = await Payment.find({ status: 'pending' })
      .populate('companyId', 'name email phone')
      .populate('paidBy', 'name email')
      .sort({ paidAt: -1 });

    res.json(pendingPayments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all approved companies (OSA Super Admin only)
router.get('/companies/approved', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    const approvedCompanies = await Company.find({ isApproved: true, paymentStatus: 'verified' })
      .populate({
        path: 'paymentVerifiedBy',
        select: 'name email'
      })
      .sort({ approvedAt: -1 });

    // Get super admin for each company
    const companiesWithAdmins = await Promise.all(
      approvedCompanies.map(async (company) => {
        const superAdmin = await User.findOne({ 
          companyId: company._id, 
          role: 'superadmin',
          userType: 'client'
        }).select('name email');

        return {
          ...company.toObject(),
          superAdmin
        };
      })
    );

    res.json(companiesWithAdmins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create payment (when company pays)
router.post('/', protect, async (req, res) => {
  try {
    const { amount, transactionId, paymentMethod, companyId } = req.body;
    
    // Verify user is associated with the company
    if (req.user.companyId.toString() !== companyId && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Not authorized to make payment for this company' });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ companyId, status: 'pending' });
    if (existingPayment) {
      return res.status(400).json({ error: 'Payment already pending for this company' });
    }

    const payment = new Payment({
      companyId,
      amount,
      transactionId,
      paymentMethod: paymentMethod || 'razorpay',
      status: 'pending',
      paidBy: req.user._id,
      paidAt: new Date()
    });

    await payment.save();

    // Update company payment status
    await Company.findByIdAndUpdate(companyId, {
      paymentStatus: 'pending',
      paymentAmount: amount
    });

    res.status(201).json({ 
      message: 'Payment submitted successfully. Waiting for OSA admin approval.',
      payment 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve payment (OSA Super Admin only)
router.patch('/:id/approve', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    const { companyId } = req.body;

    // Update payment status
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      {
        status: 'verified',
        verifiedAt: new Date(),
        verifiedBy: req.user._id
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Update company status
    await Company.findByIdAndUpdate(companyId, {
      isApproved: true,
      paymentStatus: 'verified',
      paymentVerifiedAt: new Date(),
      paymentVerifiedBy: req.user._id,
      approvedAt: new Date()
    });

    // Activate company super admin
    await User.findOneAndUpdate(
      { companyId: companyId, role: 'superadmin' },
      { isApproved: true, isVerified: true }
    );

    res.json({ 
      message: 'Payment approved and company activated successfully',
      payment 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject payment (OSA Super Admin only)
router.patch('/:id/reject', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        verifiedAt: new Date(),
        verifiedBy: req.user._id
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Update company payment status
    await Company.findByIdAndUpdate(payment.companyId, {
      paymentStatus: 'rejected'
    });

    res.json({ message: 'Payment rejected', payment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get payment status for a company
router.get('/status/:companyId', protect, async (req, res) => {
  try {
    // Only allow company users or OSA admin to check
    if (req.user.companyId?.toString() !== req.params.companyId && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const payment = await Payment.findOne({ companyId: req.params.companyId })
      .sort({ createdAt: -1 });

    const company = await Company.findById(req.params.companyId).select('isApproved paymentStatus');

    res.json({
      payment,
      companyStatus: company
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
