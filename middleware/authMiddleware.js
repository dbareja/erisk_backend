const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from header
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authorized, no token' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from token with companyId populated
    req.user = await User.findById(decoded.id).select('-password').populate('companyId');
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Set companyId from populated data if available
    if (req.user.companyId && typeof req.user.companyId === 'object') {
      req.user.companyId = req.user.companyId._id;
    }

    next();
  } catch (err) {
    res.status(401).json({ error: 'Not authorized, token failed' });
  }
};

// Restrict to specific roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized for this action' });
    }
    next();
  };
};
