const Order = require("../models/Order");
const createError = require("http-errors");

const formatOrderForAdminList = (order) => {
  return {
    id: order._id,
    order: `#${order._id.toString().slice(-6).toUpperCase()}`,
    customer: order.user ? order.user.name : "Guest",
    amount: `₹${order.totalAmount}`,
    status: order.orderStatus,
    date: order.createdAt,
  };
};

exports.getAdminOrders = async () => {
  const orders = await Order.find({})
    .populate("user", "name")
    .sort({ createdAt: -1 });

  return orders.map(formatOrderForAdminList);
};

exports.getAdminOrderById = async (orderId) => {
  const order = await Order.findById(orderId)
    .populate("user", "name email phone")
    .populate("orderItems.product", "name slug image");

  if (!order) {
    throw createError(404, "Order not found");
  }
  return order;
};

exports.updateOrderStatus = async (orderId, newStatus) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw createError(404, "Order not found");
  }

  const validStatuses = Order.schema.path('orderStatus').enumValues;
  if (!validStatuses.includes(newStatus)) {
      throw createError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  order.orderStatus = newStatus;
  await order.save();
  return order;
};

exports.deleteOrder = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw createError(404, "Order not found");
  }
  // Note: This does not restock products.
  // That logic could be added here if needed.
  await order.deleteOne();
  return { message: "Order deleted successfully" };
};