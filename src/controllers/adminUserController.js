const User = require("../models/User");
const Order = require("../models/Order");

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: "user" }).sort({ createdAt: -1 });

    const usersWithOrderCounts = await Promise.all(
      users.map(async (user) => {
        const orderCount = await Order.countDocuments({ user: user._id });
        return {
          id: user._id,
          name: user.name,
          email: user.email,
          orders: orderCount.toString(),
        };
      })
    );

    res.json({
      success: true,
      data: usersWithOrderCounts,
    });
  } catch (error) {
    next(error);
  }
};
