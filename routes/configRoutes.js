const express = require("express");

const router = express.Router();

const Config = require("../models/Config");

const { authenticate, authorize, checkModule } = require("../middleware/auth");



router.use(authenticate);



// GET available modules list - used for assign modules dropdown

router.get("/modules/list", async (req, res) => {

  try {

    // Return all available modules

    const modules = [

      { key: "dashboard", label: "Dashboard", route: "/", icon: "LayoutDashboard" },

      { key: "assets", label: "Assets", route: "/assets", icon: "Box" },

      { key: "risks", label: "Risks", route: "/risks", icon: "AlertTriangle" },

      { key: "controls", label: "Controls", route: "/controls", icon: "Shield" },

      { key: "treatments", label: "Treatments", route: "/treatments", icon: "FileCheck" },

      { key: "configuration", label: "Configuration", route: "/config/asset-categories", icon: "Wrench" },

      { key: "user_management", label: "User Management", route: "/admin/users", icon: "Users" },

    ];

    res.json(modules);

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});



router.use(checkModule("configuration"));



const getRequesterCompanyId = (req) => req.user.companyId?._id || req.user.companyId || null;



const getReadFilter = (req) => {

  if (req.user.role === "superadmin") {

    if (req.query.companyId === "global") {

      return { companyId: null };

    }



    if (req.query.companyId) {

      return { $or: [{ companyId: null }, { companyId: req.query.companyId }] };

    }



    return {};

  }



  return { $or: [{ companyId: null }, { companyId: getRequesterCompanyId(req) }] };

};



const getWritePayload = (req) => {

  const payload = { ...req.body };



  if (req.user.role === "superadmin") {

    payload.companyId = null;

    payload.createdByRole = "superadmin";

    return payload;

  }



  payload.companyId = getRequesterCompanyId(req);

  payload.createdByRole = req.user.role;

  return payload;

};



const getMutationFilter = (req, id) => {

  if (req.user.role === "superadmin") {

    return { _id: id };

  }



  return { _id: id, companyId: getRequesterCompanyId(req) };

};



// GET all configs by type

router.get("/:type", async (req, res) => {

  try {

    const configs = await Config.find({ type: req.params.type, isActive: true, ...getReadFilter(req) })

      .populate("companyId", "name")

      .sort({ companyId: 1, name: 1 });

    res.json(configs);

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});



// POST create config

router.post("/", async (req, res) => {

  try {

    const config = new Config(getWritePayload(req));

    await config.save();

    res.status(201).json(config);

  } catch (err) {

    res.status(400).json({ error: err.message });

  }

});



// PUT update config

router.put("/:id", async (req, res) => {

  try {

    const config = await Config.findOneAndUpdate(getMutationFilter(req, req.params.id), getWritePayload(req), {

      new: true,

      runValidators: true,

    });

    if (!config) return res.status(404).json({ error: "Config not found" });

    res.json(config);

  } catch (err) {

    res.status(400).json({ error: err.message });

  }

});



// DELETE config (soft delete)

router.delete("/:id", async (req, res) => {

  try {

    const config = await Config.findOneAndUpdate(getMutationFilter(req, req.params.id), { isActive: false }, { new: true });

    if (!config) return res.status(404).json({ error: "Config not found" });

    res.json({ message: "Config deleted" });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});



// Seed default configs

router.post("/seed/defaults", authorize("superadmin"), async (req, res) => {

  try {

    const defaults = [

      // Asset Categories

      { type: "asset_category", name: "Hardware", description: "Physical computing equipment" },

      { type: "asset_category", name: "Software", description: "Applications and systems" },

      { type: "asset_category", name: "Information", description: "Data and records" },

      { type: "asset_category", name: "People", description: "Human resources" },

      { type: "asset_category", name: "Services", description: "Business services" },

      { type: "asset_category", name: "Infrastructure", description: "Physical infrastructure" },

      // Asset Types

      { type: "asset_type", name: "Server", description: "Physical or virtual servers" },

      { type: "asset_type", name: "Workstation", description: "Desktop computers" },

      { type: "asset_type", name: "Mobile Device", description: "Laptops, tablets, phones" },

      { type: "asset_type", name: "Network Device", description: "Switches, routers, firewalls" },

      { type: "asset_type", name: "Storage Array", description: "SAN, NAS, tape storage" },

      { type: "asset_type", name: "Web Application", description: "Browser-based applications" },

      { type: "asset_type", name: "Enterprise Application", description: "Business software systems" },

      { type: "asset_type", name: "Cloud Application", description: "SaaS and cloud services" },

      { type: "asset_type", name: "Mobile Application", description: "iOS and Android apps" },

      { type: "asset_type", name: "Database", description: "Database systems" },

      { type: "asset_type", name: "AV Equipment", description: "Audio/visual equipment" },

      { type: "asset_type", name: "Security Device", description: "Cameras, access control" },

      { type: "asset_type", name: "Office Equipment", description: "General office equipment" },

      // Departments

      { type: "department", name: "IT", description: "Information Technology", metadata: { code: "IT" } },

      { type: "department", name: "HR", description: "Human Resources", metadata: { code: "HR" } },

      { type: "department", name: "Finance", description: "Finance Department", metadata: { code: "FIN" } },

      { type: "department", name: "Operations", description: "Operations", metadata: { code: "OPS" } },

      // Risk Categories

      { type: "risk_category", name: "Operational", description: "Operational risks" },

      { type: "risk_category", name: "Strategic", description: "Strategic risks" },

      { type: "risk_category", name: "Financial", description: "Financial risks" },

      { type: "risk_category", name: "Compliance", description: "Compliance risks" },

      { type: "risk_category", name: "Cybersecurity", description: "Cyber risks" },

      { type: "risk_category", name: "Third Party", description: "Third party risks" },

      // Risk Subcategories

      { type: "risk_subcategory", name: "Process Failure", description: "Process failures", metadata: { parent: "Operational" } },

      { type: "risk_subcategory", name: "Human Error", description: "Human errors", metadata: { parent: "Operational" } },

      { type: "risk_subcategory", name: "System Outage", description: "System outages", metadata: { parent: "Operational" } },

      { type: "risk_subcategory", name: "Data Breach", description: "Data breaches", metadata: { parent: "Cybersecurity" } },

      { type: "risk_subcategory", name: "Malware", description: "Malware attacks", metadata: { parent: "Cybersecurity" } },

      { type: "risk_subcategory", name: "Unauthorized Access", description: "Unauthorized access", metadata: { parent: "Cybersecurity" } },

      { type: "risk_subcategory", name: "Phishing", description: "Phishing attacks", metadata: { parent: "Cybersecurity" } },

      // Locations

      { type: "location", name: "Head Office", description: "Main HQ", metadata: { address: "123 Main St" } },

      { type: "location", name: "Branch Office", description: "Branch", metadata: { address: "456 Branch Ave" } },

      { type: "location", name: "Data Center", description: "Primary DC", metadata: { address: "789 DC Rd" } },

      // Risk Owners

      { type: "risk_owner", name: "John Smith", description: "IT Manager", metadata: { email: "john@company.com", phone: "+1234567890" } },

      { type: "risk_owner", name: "Jane Doe", description: "Data Officer", metadata: { email: "jane@company.com", phone: "+1234567891" } },

      { type: "risk_owner", name: "Alex Kim", description: "Security Lead", metadata: { email: "alex@company.com", phone: "+1234567892" } },

    ];



    for (const item of defaults) {

      await Config.findOneAndUpdate(

        { type: item.type, name: item.name, companyId: null },

        { ...item, companyId: null, createdByRole: "superadmin", isActive: true },

        { upsert: true, new: true }

      );

    }



    res.json({ message: "Default configs seeded successfully", count: defaults.length });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});



module.exports = router;

