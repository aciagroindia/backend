const dashboardService = require("../services/dashboard.service");

exports.getDashboardStats = async (req, res, next) => {
  try {
    const stats = await dashboardService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};


exports.getSalesChart = async (req, res, next) => {
  try {
    const data = await dashboardService.getSalesChart();

    res.json({
      success:true,
      data
    });
  } catch (error) {
    next(error);
  }
};


exports.getRecentOrders = async (req, res, next) => {
  try {
    const orders = await dashboardService.getRecentOrders();

    res.json({
      success:true,
      data:orders
    });
  } catch (error) {
    next(error);
  }
};


exports.getNewCustomers = async (req, res, next) => {
  try {
    const customers = await dashboardService.getNewCustomers();

    res.json({
      success:true,
      data:customers
    });
  } catch (error) {
    next(error);
  }
};