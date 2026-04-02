const Notification = require("../models/Notification");

exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ isCleared: false }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

exports.clearNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isCleared: true },
      { new: true }
    );
    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

exports.clearAllNotifications = async (req, res, next) => {
  try {
    await Notification.updateMany({ isCleared: false }, { isCleared: true });
    res.json({
      success: true,
      message: "All notifications cleared",
    });
  } catch (error) {
    next(error);
  }
};
