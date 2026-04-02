const Order = require("../models/Order");
const User = require("../models/User");

const getStartDate = (timeFilter) => {
  const now = new Date();
  let startDate;

  if (timeFilter === "Last 1 Year") {
    startDate = new Date(now.setFullYear(now.getFullYear() - 1));
  } else if (timeFilter === "Last 3 Months") {
    startDate = new Date(now.setMonth(now.getMonth() - 3));
  } else if (timeFilter === "Last 30 Days") {
    startDate = new Date(now.setDate(now.getDate() - 30));
  } else {
    // Default to Last 6 Months
    startDate = new Date(now.setMonth(now.getMonth() - 6));
  }
  startDate.setHours(0, 0, 0, 0); 
  return startDate;
};

exports.getOverallStats = async (timeFilter = "Last 6 Months") => {
  const startDate = getStartDate(timeFilter);

  const [totalSalesData, totalOrders, newCustomers] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } }, 
      // { $match: { paymentStatus: "paid" } }, // Uncomment later if needed
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.countDocuments({ createdAt: { $gte: startDate } }), // FIX: Filter orders by date
    User.countDocuments({ createdAt: { $gte: startDate } }),  // FIX: thirtyDaysAgo ki jagah startDate lagaya
  ]);

  const totalSales = totalSalesData[0]?.total || 0;

  return {
    totalSales,
    totalOrders,
    newCustomers,
  };
};

exports.getRevenueByMonth = async (timeFilter = "Last 6 Months") => {
  const startDate = getStartDate(timeFilter);

  const salesData = await Order.aggregate([
    {
      $match: { 
        createdAt: { $gte: startDate },
        // paymentStatus: "paid", // Uncomment later if needed
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        revenue: { $sum: "$totalAmount" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const revenueMap = new Map();
  let currentDate = new Date(startDate);
  currentDate.setDate(1); 

  const endDate = new Date();
  endDate.setDate(1); 

  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const monthIndex = currentDate.getMonth();
    const key = `${year}-${monthNames[monthIndex]}`;
    revenueMap.set(key, 0);
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  salesData.forEach(item => {
    const key = `${item._id.year}-${monthNames[item._id.month - 1]}`; 
    revenueMap.set(key, item.revenue);
  });

  return Array.from(revenueMap, ([monthKey, revenue]) => ({ month: monthKey.split('-')[1], revenue }));
};