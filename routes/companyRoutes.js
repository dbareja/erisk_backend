const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Company = require('../models/Company');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');

// Get all users in company (Company Super Admin only)
router.get('/users', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    // Get companyId from logged in user
    const companyId = req.user.companyId;
    
    // Check if user is OSA Super Admin (no company needed)
    if (req.user.userType === 'osa') {
      return res.status(403).json({ error: 'OSA Super Admin cannot access company users. Please login as Company Super Admin.' });
    }
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company Super Admin must be associated with a company. Please contact OSA admin.' });
    }

    const users = await User.find({ 
      companyId: companyId,
      role: { $in: ['subadmin', 'auditor', 'auditee', 'general'] }
    }).select('-password');

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create company user (subadmin, auditor, auditee, general)
router.post('/users', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    const { name, email, password, role, assignedModules } = req.body;
    
    // Check if user is OSA Super Admin
    if (req.user.userType === 'osa') {
      return res.status(403).json({ error: 'OSA Super Admin cannot create company users. Please login as Company Super Admin.' });
    }
    
    // Validate role
    const allowedRoles = ['subadmin', 'auditor', 'auditee', 'general'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be subadmin, auditor, auditee, or general' });
    }

    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Get company from logged in superadmin
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'Company Super Admin must be associated with a company. Please contact OSA admin to link your account.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      companyId,
      assignedModules: assignedModules || [],
      isApproved: true, // Auto-approved for company users
      isVerified: true,
      userType: 'client',
      userCategory: role === 'subadmin' ? 'subadmin' : 'user',
      parentCompany: companyId
    });

    await user.save();
    
    res.status(201).json({ 
      message: `${role} created successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedModules: user.assignedModules
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete company user
router.delete('/users/:id', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    const user = await User.findOne({ 
      _id: req.params.id, 
      companyId: req.user.companyId 
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user modules (for subadmins)
router.put('/users/:id/modules', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    const { assignedModules } = req.body;
    
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { assignedModules },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Modules updated', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
