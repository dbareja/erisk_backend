const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const dns = require("dns");
require("dotenv").config();

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: ["http://localhost:8080", "http://localhost:3000", "https://riskmgmt.ezrisk.in", "https://ezrisk-risk-assetmgmt.web.app"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
}));
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/grc_platform";
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 10,
      retryWrites: true,
      w: "majority",
    });
    console.log("✅ MongoDB Connected");

    // Seed default super admins
    const User = require("./models/User");
    
    try {
      // OSA Super Admin (Platform Admin)
      const existingOSA = await User.findOne({ email: "osaadmin@ezrisk.com" });
      if (!existingOSA) {
        await User.create({
          name: "OSA Super Admin",
          email: "osaadmin@ezrisk.com",
          password: "OSA@Admin123",
          role: "superadmin",
          userType: "osa",
          isApproved: true,
          isVerified: true,
          emailVerifiedAt: new Date(),
          assignedModules: ["all"],
        });
        console.log("✅ OSA Super Admin created (osaadmin@ezrisk.com / OSA@Admin123)");
      } else {
        console.log("ℹ️ OSA Super Admin already exists");
      }
    } catch (err) {
      if (err.code === 11000) {
        console.log("ℹ️ OSA Super Admin already exists (duplicate key)");
      } else {
        console.error("❌ Error creating OSA Super Admin:", err.message);
      }
    }
    
    try {
      // Default Company Super Admin (for testing) - WITH COMPANY
      const existingSA = await User.findOne({ email: "superadmin@grc.com" });
      if (!existingSA) {
        // First create a dummy company
        const Company = require("./models/Company");
        let testCompany = await Company.findOne({ email: "testcompany@grc.com" });
        
        if (!testCompany) {
          testCompany = await Company.create({
            name: "Test Company",
            email: "testcompany@grc.com",
            phone: "+91-9876543210",
            address: "Test Address, Mumbai",
            isApproved: true,
            isActive: true,
            paymentStatus: "paid",
            companyType: "client",
          });
          console.log("✅ Test Company created");
        }
        
        // Now create user with companyId
        await User.create({
          name: "Company Super Admin",
          email: "superadmin@grc.com",
          password: "Admin@123",
          role: "superadmin",
          userType: "client",
          companyId: testCompany._id,
          isApproved: true,
          isVerified: true,
          emailVerifiedAt: new Date(),
          assignedModules: ["all"],
        });
        console.log("✅ Company Super Admin created (superadmin@grc.com / Admin@123) with linked company");
      } else if (!existingSA.companyId) {
        // If user exists but no companyId, update it
        const Company = require("./models/Company");
        let testCompany = await Company.findOne({ email: "testcompany@grc.com" });
        
        if (!testCompany) {
          testCompany = await Company.create({
            name: "Test Company",
            email: "testcompany@grc.com",
            phone: "+91-9876543210",
            address: "Test Address, Mumbai",
            isApproved: true,
            isActive: true,
            paymentStatus: "paid",
            companyType: "client",
          });
        }
        
        existingSA.companyId = testCompany._id;
        await existingSA.save();
        console.log("✅ Company Super Admin linked to Test Company");
      } else {
        console.log("ℹ️ Company Super Admin already exists with company");
      }
    } catch (err) {
      if (err.code === 11000) {
        console.log("ℹ️ Company Super Admin already exists (duplicate key)");
      } else {
        console.error("❌ Error creating Company Super Admin:", err.message);
      }
    }
  } catch (error) {
    console.error("❌ MongoDB Error:", error.message);
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/assets", require("./routes/assetRoutes"));
app.use("/api/risks", require("./routes/riskRoutes"));
app.use("/api/controls", require("./routes/controlRoutes"));
app.use("/api/treatments", require("./routes/treatmentRoutes"));
app.use("/api/config", require("./routes/configRoutes"));
app.use("/api/company", require("./routes/companyRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/payments", require("./routes/razorpayRoutes"));

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
