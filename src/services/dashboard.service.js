const Order = require("../models/Order");
const User = require("../models/User");

exports.getStats = async () => {
  const totalOrders = await Order.countDocuments();
  const totalUsers = await User.countDocuments();

  const revenueAgg = await Order.aggregate([
    {
      $group: {
        _id: null,
        revenue: { $sum: "$totalAmount" }
      }
    }
  ]);

  const totalRevenue = revenueAgg[0]?.revenue || 0;

  return {
    orders: totalOrders,
    users: totalUsers,
    revenue: totalRevenue,
    // Note: Percentage change (+12% etc.) nikaalne ke liye pichle mahine ka data compare karna hoga.
    // Filhal hum generic values bhej sakte hain ya isko calculate kar sakte hain.
  };
};

exports.getSalesChart = async () => {
  const sales = await Order.aggregate([
    {
      $group: {
        _id: { $month: "$createdAt" },
        sales: { $sum: "$totalAmount" }
      }
    },
    { $sort: { "_id": 1 } }
  ]);

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return sales.map(item => ({
    month: months[item._id - 1],
    sales: item.sales
  }));
};

exports.getRecentOrders = async () => {
  const orders = await Order.find()
    .populate("customer", "name") // Order model mein 'customer' ref hai
    .sort({ createdAt: -1 })
    .limit(5);

  return orders.map(o => ({
    _id: o._id,
    customer: o.customer?.name || "Guest", // String bhej rahe hain
    totalPrice: o.totalAmount,            // Frontend 'totalPrice' key dhund raha hai
    orderStatus: o.orderStatus,           // Frontend 'orderStatus' key dhund raha hai
    createdAt: o.createdAt                // Frontend 'createdAt' key dhund raha hai
  }));
};

exports.getNewCustomers = async () => {
  const users = await User.find({ role: 'user' }) // Sirf customers dikhayein, admins nahi
    .sort({ createdAt: -1 })
    .limit(5);

  return users.map(u => ({
    name: u.name,
    email: u.email
  }));
};