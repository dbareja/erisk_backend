const mongoose = require("mongoose");
const dns = require("dns");
const Asset = require("./models/Asset");
const Company = require("./models/Company");
const User = require("./models/User");
require("dotenv").config();

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

async function seedAssetsForDef() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find or create company "Def"
    let company = await Company.findOne({ name: "Def" });
    if (!company) {
      company = await Company.create({
        name: "Tifin Service",
        email: "harshdeep20020203@gmail.com",
        modules: ["dashboard", "assets", "risks", "controls", "treatments", "configuration"]
      });
      console.log("Created company: Def");
    } else {
      console.log("Found existing company: Def");
    }

    // Find or create user with the email
    let user = await User.findOne({ email: "harshdeep20020203@gmail.com" });
    if (!user) {
      user = await User.create({
        name: "Harshdeep",
        email: "harshdeep20020203@gmail.com",
        password: "$2a$10$YourHashedPasswordHere", // You should hash a real password
        role: "company_admin",
        companyId: company._id,
        status: "approved"
      });
      console.log("Created user: harshdeep20020203@gmail.com");
    } else {
      console.log("Found existing user");
    }

    const companyId = company._id;

    // Sample assets data
    const assetsData = [
      {
        name: "Corporate Database Server",
        category: "Hardware",
        assetType: "Tangible Asset",
        description: "Primary database server hosting all corporate data",
        department: "IT Department",
        location: "Data Center 1",
        businessCriticality: "Critical",
        c: 5,
        i: 5,
        a: 4,
        owner: "Harshdeep",
        custodian: "IT Team",
        retentionPeriod: "7 Years",
        status: "Active"
      },
      {
        name: "Customer Management System",
        category: "Software",
        assetType: "Digital Asset",
        description: "CRM system for managing customer relationships",
        department: "Sales",
        location: "Cloud",
        businessCriticality: "High",
        c: 4,
        i: 4,
        a: 4,
        owner: "Sales Manager",
        custodian: "IT Team",
        retentionPeriod: "5 Years",
        status: "Active"
      },
      {
        name: "Employee Records Database",
        category: "Information",
        assetType: "Digital Asset",
        description: "Confidential employee records and HR data",
        department: "Human Resources",
        location: "On-Premises",
        businessCriticality: "High",
        c: 5,
        i: 5,
        a: 3,
        owner: "HR Manager",
        custodian: "HR Team",
        retentionPeriod: "Permanent",
        status: "Active"
      },
      {
        name: "Network Infrastructure",
        category: "Infrastructure",
        assetType: "Tangible Asset",
        description: "Core network switches, routers and firewalls",
        department: "IT Department",
        location: "Server Room",
        businessCriticality: "Critical",
        c: 4,
        i: 4,
        a: 5,
        owner: "Network Admin",
        custodian: "IT Team",
        retentionPeriod: "5 Years",
        status: "Active"
      },
      {
        name: "Financial Reporting System",
        category: "Software",
        assetType: "Digital Asset",
        description: "Financial reporting and accounting software",
        department: "Finance",
        location: "Cloud",
        businessCriticality: "Critical",
        c: 5,
        i: 5,
        a: 4,
        owner: "CFO",
        custodian: "Finance Team",
        retentionPeriod: "10 Years",
        status: "Active"
      },
      {
        name: "Email Server Cluster",
        category: "Infrastructure",
        assetType: "Digital Asset",
        description: "Corporate email infrastructure",
        department: "IT Department",
        location: "Data Center 2",
        businessCriticality: "High",
        c: 4,
        i: 4,
        a: 5,
        owner: "IT Manager",
        custodian: "IT Team",
        retentionPeriod: "7 Years",
        status: "Active"
      }
    ];

    // Delete existing assets for this company to avoid duplicates
    await Asset.deleteMany({ companyId });
    console.log("Cleared existing assets for company Def");

    // Create new assets with companyId
    for (const assetData of assetsData) {
      const asset = new Asset({
        ...assetData,
        companyId
      });
      await asset.save();
      console.log(`Created asset: ${asset.name} (${asset.assetId})`);
    }

    console.log("\nSeeding completed successfully!");
    console.log(`Total assets created: ${assetsData.length}`);
    
  } catch (error) {
    console.error("Error seeding assets:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

seedAssetsForDef();
