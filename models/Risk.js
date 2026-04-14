const mongoose = require("mongoose");

const riskSchema = new mongoose.Schema(
  {
    riskId: { type: String, unique: true, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    name: { type: String, required: true },
    controlReference: { type: String },
    description: { type: String },
    category: { type: String, required: true },
    subcategory: { type: String },
    status: { type: String, enum: ["Open", "Mitigating", "Accepted", "Closed"], default: "Open" },

    // Asset Info
    assetId: { type: String },
    assetGroups: [{ type: String }],
    assetType: { type: String },

    // CIA from asset (auto-fetched)
    c: { type: Number, default: 0 },
    i: { type: Number, default: 0 },
    a: { type: Number, default: 0 },
    assetScore: { type: Number, default: 0 },
    assetRanking: { type: String },
    assetValue: { type: Number, default: 1 },

    // Threat & Vulnerability
    threat: { type: String },
    tValue: { type: Number, min: 1, max: 4, default: 1 },
    vulnerability: { type: String },
    vValue: { type: Number, min: 1, max: 4, default: 1 },
    tvValue: { type: Number },
    tvPair: { type: Number },

    // Probability & Impact
    probability: { type: Number, min: 1, max: 5, default: 1 },
    impact: { type: Number, min: 1, max: 5, default: 1 },

    // Absolute Risk
    absoluteRIR: { type: Number },
    riskImpactRating: { type: String },

    // Primary Control
    primaryControl: {
      existingControls: { type: String },
      implementationParameter: { type: String },
      controlEffectiveness: { type: String, enum: ["Effective", "Partially Effective", "Ineffective"] },
    },

    // Compensatory Control
    compensatoryControl: {
      existingControls: { type: String },
      implementationParameter: { type: String },
      controlEffectiveness: { type: String, enum: ["Effective", "Partially Effective", "Ineffective"] },
    },

    // Final Risk
    revisedRIR: { type: Number },
    riskPriority: { type: String },

    // Treatment
    treatmentRequired: { type: String, enum: ["Yes", "No", ""] },
    treatmentOption: { type: String },
    treatmentPlan: { type: String },
    treatmentTargetDate: { type: Date },
    treatmentCompletionDate: { type: Date },
    treatmentResponsibleEmail: { type: String },
    treatmentResponsiblePhone: { type: String },
    treatmentStatus: { type: String, enum: ["Open", "In Progress", "Delayed", "Completed"] },
    riskAcceptanceNotes: { type: String },
    businessJustification: { type: String },

    // Owner
    riskOwner: { type: String },
  },
  { timestamps: true }
);

// Auto-generate riskId & calculations
riskSchema.pre("validate", async function (next) {
  if (!this.riskId) {
    const count = await mongoose.model("Risk").countDocuments();
    this.riskId = `R-${String(count + 1).padStart(3, "0")}`;
  }

  // Risk Score = Inherent Likelihood * Business Impact (max 25)
  const riskScore = this.probability * this.impact;
  this.revisedRIR = riskScore;
  
  // Risk Priority based on score ranges
  if (riskScore >= 1 && riskScore <= 3) this.riskPriority = "Very Low";
  else if (riskScore >= 4 && riskScore <= 6) this.riskPriority = "Low";
  else if (riskScore >= 8 && riskScore <= 12) this.riskPriority = "Medium";
  else if (riskScore >= 15 && riskScore <= 16) this.riskPriority = "High";
  else if (riskScore >= 20 && riskScore <= 25) this.riskPriority = "Critical";
  else this.riskPriority = "Unknown";

  next();
});

module.exports = mongoose.model("Risk", riskSchema);
