const mongoose = require("mongoose");

const findingSchema = new mongoose.Schema({
  area: { type: String, required: true },
  observation: { type: String, required: true },
  severity: { type: String, enum: ["Critical", "High", "Medium", "Low", "Informational"], default: "Medium" },
  recommendation: { type: String },
  status: { type: String, enum: ["Open", "Closed", "In Progress"], default: "Open" },
});

const auditReportSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ["Internal", "External", "Regulatory", "System Integrity"], default: "Internal" },
  scope: { type: String },
  auditDate: { type: Date, default: Date.now },
  status: { type: String, enum: ["Draft", "Published"], default: "Draft" },
  overallCompliance: { type: String, enum: ["Compliant", "Partially Compliant", "Non-Compliant"], default: "Partially Compliant" },
  findings: [findingSchema],
  summary: { type: String },
  // KEY: Company isolation field
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  // Who created this report (auditor)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdByName: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("AuditReport", auditReportSchema);
