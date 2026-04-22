const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["superadmin", "subadmin", "client", "auditor", "auditee", "general"],
      default: "client",
    },
    userType: {
      type: String,
      enum: ["osa", "client"],
      default: "client",
    },
    userCategory: {
      type: String,
      enum: ["superadmin", "subadmin", "internal", "auditor", "auditee", "general"],
      default: "general",
    },
    parentCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentVerifiedAt: { type: Date },
    allocatedResources: {
      maxUsers: { type: Number, default: 0 },
      maxAssets: { type: Number, default: 0 },
      maxRisks: { type: Number, default: 0 },
    },
    assignedModules: {
      type: [String],
      default: [],
    },
    isApproved: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    verificationToken: { type: String },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  delete obj.verificationToken;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
