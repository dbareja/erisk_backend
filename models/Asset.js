const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
  {
    assetId: { type: String, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    assetType: { type: String },
    groups: [{ type: String }],
    description: { type: String },
    department: { type: String },
    location: { type: String },
    businessCriticality: { type: String, enum: ["Low", "Medium", "High", "Critical"] },
    c: { type: Number, min: 1, max: 5, default: 1 },
    i: { type: Number, min: 1, max: 5, default: 1 },
    a: { type: Number, min: 1, max: 5, default: 1 },
    assetValue: { type: Number },
    assetScore: { type: Number },
    assetRanking: { type: String },
    owner: { type: String },
    custodian: { type: String },
    retentionPeriod: { type: String },
    reviewDueDate: { type: Date },
    entryBy: { type: String },
    reviewer: { type: String },
    reviewDate: { type: Date },
    status: { type: String, enum: ["Active", "Inactive", "Under Review"], default: "Active" },
    licenseDetails: { type: String },
  },
  { timestamps: true }
);

// Auto-generate assetId
assetSchema.pre("validate", async function (next) {
  if (!this.assetId) {
    const count = await mongoose.model("Asset").countDocuments({ companyId: this.companyId });
    this.assetId = `A${String(count + 1).padStart(3, "0")}`;
  }
  // Auto-calculate
  this.assetScore = this.c + this.i + this.a;
  this.assetValue = Math.max(this.c, this.i, this.a);
  this.assetRanking =
    this.assetScore >= 13 ? "Critical" : this.assetScore >= 10 ? "High" : this.assetScore >= 6 ? "Medium" : "Low";
  next();
});

module.exports = mongoose.model("Asset", assetSchema);
