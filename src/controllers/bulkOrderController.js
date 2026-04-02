const BulkOrder = require("../models/BulkOrder");
const createError = require("http-errors");


// CREATE BULK ORDER REQUEST
exports.createBulkOrder = async (req, res, next) => {
  try {
    const { firstName, email, phone, message } = req.body;

    const bulkOrder = await BulkOrder.create({
      firstName,
      email,
      phone,
      message,
    });

    res.status(201).json({
      success: true,
      message: "Bulk order request submitted",
      data: bulkOrder,
    });
  } catch (error) {
    next(error);
  }
};


// GET ALL BULK ORDERS (ADMIN)
exports.getBulkOrders = async (req, res, next) => {
  try {
    const orders = await BulkOrder.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE BULK ORDER STATUS (ADMIN)
exports.updateBulkOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await BulkOrder.findById(req.params.id);

    if (!order) {
      throw createError(404, "Bulk order request not found");
    }

    order.status = status;
    await order.save();

    res.json({
      success: true,
      message: "Bulk order status updated successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};