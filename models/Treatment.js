const mongoose = require("mongoose");

const treatmentSchema = new mongoose.Schema(
  {
    treatmentId: { type: String, unique: true, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    riskId: { type: String },
    riskName: { type: String, required: true },
    plan: { type: String },
    option: { type: String, enum: ["Mitigate", "Transfer", "Accept", "Avoid"] },
    targetDate: { type: Date },
    completionDate: { type: Date },
    actualDate: { type: Date },
    responsibleEmail: { type: String },
    responsiblePhone: { type: String },
    rtpReference: { type: String },
    notes: { type: String },
    status: { type: String, enum: ["Planned", "In Progress", "Completed", "Accepted"], default: "Planned" },
  },
  { timestamps: true }
);

treatmentSchema.pre("validate", async function (next) {
  if (!this.treatmentId) {
    const count = await mongoose.model("Treatment").countDocuments();
    this.treatmentId = `T${String(count + 1).padStart(3, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Treatment", treatmentSchema);
