const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true, sparse: true }, // url-friendly name e.g. "tata"
    accountType: { type: String, enum: ["company", "individual"], default: "company" },
    email: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    logo: { type: String },
    isApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentVerifiedAt: { type: Date },
    paymentVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    allocatedResources: {
      maxUsers: { type: Number, default: 10 },
      maxAssets: { type: Number, default: 100 },
      maxRisks: { type: Number, default: 100 },
      maxStorageGB: { type: Number, default: 5 },
    },
    companyType: {
      type: String,
      enum: ["osa", "client"],
      default: "client",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);
