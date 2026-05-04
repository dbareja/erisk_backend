const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { authorize, protect } = require("../middleware/authMiddleware");

// Apply protect to all notification routes
router.use(protect);

// GET /api/notifications - Get all notifications for the user
router.get("/", async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === "superadmin" && req.user.userType === "osa") {
      // OSA admins see registration and payment notifications
      filter = { $or: [{ type: "registration" }, { type: "payment" }, { userId: req.user._id }] };
    } else {
      // Normal users see their own notifications
      filter = { userId: req.user._id };
    }

    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(20);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch("/:id/read", async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/mark-all-read - Mark all as read
router.post("/mark-all-read", async (req, res) => {
  try {
    let filter = { userId: req.user._id };
    if (req.user.role === "superadmin" && req.user.userType === "osa") {
        filter = { $or: [{ type: "registration" }, { type: "payment" }, { userId: req.user._id }] };
    }
    await Notification.updateMany(filter, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
