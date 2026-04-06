const mongoose = require("mongoose");

const controlSchema = new mongoose.Schema(
  {
    controlId: { type: String, unique: true, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    name: { type: String, required: true },
    type: { type: String, enum: ["Preventive", "Detective", "Corrective"], required: true },
    nature: { type: String, enum: ["Manual", "Automated"], required: true },
    parameter: { type: String, enum: ["Technical", "Administrative", "Physical"] },
    effectiveness: { type: String, enum: ["None", "Low", "Medium", "High"] },
    value: { type: Number },
    ranking: { type: String },
  },
  { timestamps: true }
);

controlSchema.pre("validate", async function (next) {
  if (!this.controlId) {
    const count = await mongoose.model("Control").countDocuments();
    this.controlId = `C${String(count + 1).padStart(3, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Control", controlSchema);
