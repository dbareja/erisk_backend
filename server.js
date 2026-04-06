const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const dns = require("dns");
require("dotenv").config();

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
}));
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/grc_platform";
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 10,
      retryWrites: true,
      w: "majority",
    });
    console.log("✅ MongoDB Connected");

    // Seed default super admin
    const User = require("./models/User");
    const existingSA = await User.findOne({ role: "superadmin" });
    if (!existingSA) {
      await User.create({
        name: "Super Admin",
        email: "superadmin@grc.com",
        password: "Admin@123",
        role: "superadmin",
        isApproved: true,
        isVerified: true,
        emailVerifiedAt: new Date(),
        assignedModules: ["all"],
      });
      console.log("✅ Default Super Admin created (superadmin@grc.com / Admin@123)");
    }
  } catch (error) {
    console.error("❌ MongoDB Error:", error.message);
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/assets", require("./routes/assetRoutes"));
app.use("/api/risks", require("./routes/riskRoutes"));
app.use("/api/controls", require("./routes/controlRoutes"));
app.use("/api/treatments", require("./routes/treatmentRoutes"));
app.use("/api/config", require("./routes/configRoutes"));

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
