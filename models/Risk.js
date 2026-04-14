const mongoose = require("mongoose");

function getRiskLevel(score) {
  if (score >= 1 && score <= 3) return "Very Low";
  if (score >= 4 && score <= 6) return "Low";
  if (score >= 8 && score <= 12) return "Medium";
  if (score >= 15 && score <= 16) return "High";
  if (score >= 20 && score <= 25) return "Critical";
  return "Unknown";
}

function applyRiskCalculations(target) {
  const probability = Number(target.probability ?? 1);
  const impact = Number(target.impact ?? 1);
  const residualLikelihood = Number(target.residualLikelihood ?? probability);
  const residualImpact = Number(target.residualImpact ?? impact);

  const riskScore = probability * impact;
  const residualRiskScore = residualLikelihood * residualImpact;

  target.probability = probability;
  target.impact = impact;
  target.riskScore = riskScore;
  target.absoluteRIR = riskScore;
  target.riskImpactRating = getRiskLevel(riskScore);

  target.residualLikelihood = residualLikelihood;
  target.residualImpact = residualImpact;
  target.residualRiskScore = residualRiskScore;
  target.residualRiskPriority = getRiskLevel(residualRiskScore);

  // Keep legacy fields aligned with residual risk so older UI/API consumers still work.
  target.revisedRIR = residualRiskScore;
  target.riskPriority = target.residualRiskPriority;
}

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
    riskScore: { type: Number },

    // Absolute Risk
    absoluteRIR: { type: Number },
    riskImpactRating: { type: String },

    // Residual Risk
    residualLikelihood: { type: Number, min: 1, max: 5, default: 1 },
    residualImpact: { type: Number, min: 1, max: 5, default: 1 },
    residualRiskScore: { type: Number },
    residualRiskPriority: { type: String },

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

  applyRiskCalculations(this);

  next();
});

riskSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const updateDoc = update.$set ? { ...update.$set } : { ...update };

  applyRiskCalculations(updateDoc);

  if (update.$set) {
    update.$set = updateDoc;
  } else {
    Object.assign(update, updateDoc);
  }

  this.setUpdate(update);
  next();
});

module.exports = mongoose.model("Risk", riskSchema);
