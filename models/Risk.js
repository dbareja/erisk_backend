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
    assetName: { type: String },
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
      controlNature: { type: Number, default: 2 },
      controlType: { type: Number, default: 1 },
      cce: { type: Number, default: 1 },
      controlValue: { type: Number },
      controlRanking: { type: String },
      controlRankingValue: { type: Number },
    },

    // Compensatory Control
    compensatoryControl: {
      existingControls: { type: String },
      implementationParameter: { type: String },
      controlNature: { type: Number, default: 2 },
      controlType: { type: Number, default: 1 },
      cce: { type: Number, default: 1 },
      controlValue: { type: Number },
      controlRanking: { type: String },
      controlRankingValue: { type: Number },
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
    rtpReference: { type: String },
    actualDate: { type: Date },
    riskAcceptanceNotes: { type: String },

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

  // TV
  this.tvValue = this.tValue + this.vValue;
  if (this.tvValue < 3) this.tvPair = 1;
  else if (this.tvValue < 5) this.tvPair = 2;
  else if (this.tvValue < 7) this.tvPair = 3;
  else this.tvPair = 4;

  // Absolute RIR
  this.absoluteRIR = this.assetValue * this.tvPair * this.probability;
  this.riskImpactRating =
    this.absoluteRIR >= 16 ? "Critical" : this.absoluteRIR >= 9 ? "High" : this.absoluteRIR >= 4 ? "Medium" : "Low";

  // Control calculations
  const calcCV = (cn, ct, cce) => cn * ct * cce;
  const calcCR = (cv) => {
    if (cv < 7) return 1;
    if (cv < 13) return 2;
    if (cv < 19) return 3;
    return 4;
  };
  const crLabel = (cr) => (cr <= 1 ? "D" : cr === 2 ? "C" : cr === 3 ? "B" : "A");

  if (this.primaryControl) {
    const cv = calcCV(this.primaryControl.controlNature, this.primaryControl.controlType, this.primaryControl.cce);
    this.primaryControl.controlValue = cv;
    this.primaryControl.controlRankingValue = calcCR(cv);
    this.primaryControl.controlRanking = crLabel(calcCR(cv));
  }
  if (this.compensatoryControl) {
    const cv = calcCV(this.compensatoryControl.controlNature, this.compensatoryControl.controlType, this.compensatoryControl.cce);
    this.compensatoryControl.controlValue = cv;
    this.compensatoryControl.controlRankingValue = calcCR(cv);
    this.compensatoryControl.controlRanking = crLabel(calcCR(cv));
  }

  // Revised RIR
  const pcr = this.primaryControl?.controlRankingValue || 0;
  const ccp = this.compensatoryControl?.controlRankingValue || 0;
  this.revisedRIR = (pcr + ccp) > 0 ? parseFloat(((this.probability * this.impact) / (pcr + ccp)).toFixed(2)) : this.probability * this.impact;
  this.riskPriority =
    this.revisedRIR >= 16 ? "Critical" : this.revisedRIR >= 9 ? "High" : this.revisedRIR >= 4 ? "Medium" : "Low";

  next();
});

module.exports = mongoose.model("Risk", riskSchema);
