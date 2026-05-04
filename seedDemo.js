const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dns = require("dns");
const Company = require("./models/Company");
const User = require("./models/User");
require("dotenv").config();

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

async function seedDemo() {
  try {
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/grc_platform";
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    // 1. Create or Update Demo Company
    let company = await Company.findOne({ slug: "demo-company" });
    if (!company) {
      company = new Company({
        name: "Demo Company",
        slug: "demo-company",
        email: "demo@ezrisk.in",
        phone: "9876543210",
        address: "EzRisk Demo Lab",
        isApproved: true,
        paymentStatus: "paid",
        companyType: "client"
      });
      await company.save();
      console.log("🏢 Demo Company created");
    } else {
      console.log("🏢 Demo Company already exists");
    }

    // 2. Create or Update Demo User
    const email = "demo@ezrisk.in";
    const password = "Demo@123";
    
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        name: "Demo Admin",
        email: email,
        password: password, // Will be hashed by pre-save hook
        role: "superadmin", // To match restrictTo('superadmin') in company routes
        userType: "client",
        userCategory: "superadmin",
        companyId: company._id,
        isApproved: true,
        isVerified: true,
        paymentStatus: "paid",
        assignedModules: ["dashboard", "assets", "risks", "controls", "treatments", "configuration"]
      });
      await user.save();
      console.log("👤 Demo User created: " + email);
    } else {
      user.password = password; // Reset password if user exists
      user.companyId = company._id;
      user.role = "superadmin";
      user.isApproved = true;
      user.isVerified = true;
      await user.save();
      console.log("👤 Demo User updated: " + email);
    }

    console.log("\n🚀 Demo Seeding Completed!");
    console.log("URL: /demo-company/login");
    console.log("Email: " + email);
    console.log("Password: " + password);

  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

seedDemo();
