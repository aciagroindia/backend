const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["order", "user", "alert"],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    link: {
      type: String,
    },
    isCleared: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notification", notificationSchema);
