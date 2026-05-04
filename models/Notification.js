const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["registration", "payment", "approval", "system"], default: "system" },
    link: { type: String }, // Route to navigate to
    isRead: { type: Boolean, default: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Target user (null for OSA admins)
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
