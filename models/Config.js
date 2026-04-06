const mongoose = require("mongoose");

// Generic config model for all master data
const configSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "asset_category",
        "asset_classification",
        "asset_type",
        "retention_period",
        "department",
        "location",
        "risk_category",
        "risk_subcategory",
        "risk_owner",
        "asset_id_format",
      ],
    },
    name: { type: String, required: true },
    description: { type: String },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    createdByRole: {
      type: String,
      enum: ["superadmin", "subadmin", "client"],
      default: "client",
    },
    // Extra fields based on type
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

configSchema.index({ type: 1, name: 1, companyId: 1 }, { unique: true });

module.exports = mongoose.model("Config", configSchema);
