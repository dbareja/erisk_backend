const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "grc-super-secret-key-2024";
const DEFAULT_CLIENT_MODULES = ["dashboard", "assets", "risks", "controls", "treatments", "configuration"];

// Auth middleware - verify JWT
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).populate("companyId").populate("parentCompany");
    if (!user) return res.status(401).json({ error: "User not found" });

    if (user.role !== "superadmin") {
      if (!user.isApproved || user.companyId?.isApproved === false) {
        return res.status(403).json({ error: "Your company is pending Super Admin approval" });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// RBAC middleware - check role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
};

// Module check middleware - check if user has access to module
const checkModule = (moduleName) => {
  return (req, res, next) => {
    // Superadmin and auditor can access all modules
    if (req.user.role === "superadmin" || req.user.role === "auditor") return next();

    const assignedModules = req.user.role === "client"
      ? DEFAULT_CLIENT_MODULES
      : (req.user.assignedModules || []);

    if (assignedModules.includes(moduleName) || assignedModules.includes("all")) {
      return next();
    }

    return res.status(403).json({ error: `No access to ${moduleName} module` });
  };
};

const resolveUserCompanyId = (user) => {
  // companyId may be populated (full Company doc) or a plain ObjectId
  if (user?.companyId) {
    if (typeof user.companyId === "object" && user.companyId._id) {
      return user.companyId._id;
    }
    return user.companyId;
  }
  // Fallback to parentCompany (used for auditors/subadmins created via company routes)
  return user?.parentCompany || null;
};

// Company scope middleware - filter data by companyId for clients
const companyScope = (req, res, next) => {
  const { role, userType } = req.user;
  
  // OSA admin/subadmin can see all companies, optionally filter by query param
  if (userType === "osa" && (role === "superadmin" || role === "subadmin")) {
    if (req.query.companyId) {
      req.companyFilter = { companyId: req.query.companyId };
    } else {
      req.companyFilter = {};
    }
  } else {
    // All client users (superadmin, subadmin, auditor, etc.) only see their company data
    const userCompanyId = resolveUserCompanyId(req.user);
    if (!userCompanyId) {
      console.warn(`⚠️ companyScope: No companyId found for user ${req.user.email} (role: ${role}). Data will be empty.`);
    }
    req.companyFilter = userCompanyId ? { companyId: userCompanyId } : { _id: null };
  }
  next();
};

module.exports = { authenticate, authorize, checkModule, companyScope, JWT_SECRET, DEFAULT_CLIENT_MODULES };
