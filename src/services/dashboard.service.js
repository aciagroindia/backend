const Order = require("../models/Order");
const User = require("../models/User");

// FIX: Global strict filter taaki baar-baar likhna na pade
const validOrderFilter = {
    $or: [
        { paymentMethod: 'COD' },
        { paymentStatus: 'paid' }
    ]
};

exports.getStats = async () => {
  // FIX: Sirf genuine orders count honge
  const totalOrders = await Order.countDocuments(validOrderFilter);
  const totalUsers = await User.countDocuments();

  const revenueAgg = await Order.aggregate([
    // FIX: Revenue me sirf paid aur COD orders ka paisa judega
    { $match: validOrderFilter },
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
  };
};

exports.getSalesChart = async () => {
  const sales = await Order.aggregate([
    // FIX: Chart me bhi sirf valid sales aayengi
    { $match: validOrderFilter },
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
  // FIX: Recent orders me bhi failed orders nahi dikhenge
  const orders = await Order.find(validOrderFilter)
    .populate("customer", "name") 
    .sort({ createdAt: -1 })
    .limit(5);

  // FIX: Frontend ki zarurat ke hisaab se exact keys match ki hain
  return orders.map(o => ({
    id: o._id,
    customerName: o.customer?.name || "Guest", 
    total: o.totalAmount,            
    status: o.orderStatus,           
    date: o.createdAt                
  }));
};

exports.getNewCustomers = async () => {
  const users = await User.find({ role: 'user' }) 
    .sort({ createdAt: -1 })
    .limit(5);

  return users.map(u => ({
    name: u.name,
    email: u.email
  }));
};