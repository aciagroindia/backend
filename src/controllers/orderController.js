const Order = require("../models/Order");
const Cart = require("../models/cart.model");
const Product = require("../models/Product");
const Notification = require("../models/Notification");
const createError = require("http-errors");

// CREATE ORDER
exports.createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

    // --- Server-Side Price & Stock Verification ---
    const productIds = items.map(item => item.productId);
    const productsFromDB = await Product.find({ _id: { $in: productIds } });

    const productMap = new Map(productsFromDB.map(p => [p._id.toString(), p]));

    let serverCalculatedTotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product) {
        throw createError(404, `Product with ID ${item.productId} not found.`);
      }

      if (product.stock < item.quantity) {
        throw createError(400, `Not enough stock for ${product.name}. Only ${product.stock} available.`);
      }

      serverCalculatedTotal += product.price * item.quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.image,
      });
    }
    // --- End Verification ---

    const order = await Order.create({
      customer: req.user.id, // Changed from 'user' to 'customer' as per model update
      orderItems,
      shippingInfo: shippingAddress, // FIX: Match the 'shippingInfo' field in the Order model
      totalAmount: serverCalculatedTotal,
      paymentMethod: paymentMethod || 'COD', // FIX: Use paymentMethod from body or default
      // Note: 'isPaid' will default to false, and 'orderStatus' will default to 'created' as per the model
    });

    // CREATE NOTIFICATION
    await Notification.create({
        type: "order",
        text: `New order received #${order._id.toString().slice(-4)}`,
        link: "/admin/orders"
    });

    // CHECK STOCK ALERTS
    for (const item of items) {
        const product = await Product.findById(item.productId);
        if (product.stock <= 10) {
            await Notification.create({
                type: "alert",
                text: `Low stock alert: ${product.name} (${product.stock} left)`,
                link: `/admin/products`
            });
        }
    }

    // Decrease stock for each item in the order
    const bulkStockUpdate = orderItems.map(item => ({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { stock: -item.quantity, numSales: item.quantity, salesCount: item.quantity } }
      }
    }));
    await Product.bulkWrite(bulkStockUpdate);

    // Clear the user's cart after creating an order, unless specified otherwise
    if (req.body.clearCart !== false) {
      await Cart.updateOne(
        { user: req.user.id },
        { $set: { items: [] } }
      );
    }

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// FAKE PAYMENT SUCCESS
exports.fakePaymentSuccess = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        paymentStatus: "paid",
        orderStatus: "processing",
      },
      { new: true }
    );

    if (!order) {
      throw createError(404, "Order not found");
    }

    res.json({
      success: true,
      message: "Payment successful (DEV MODE)",
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// GET MY ORDERS
exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user.id }) // Changed from 'user' to 'customer'
      .populate('orderItems.product', 'name slug image')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

// GET ORDER BY ID
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email') // Populate customer details as per admin controller
      .populate('orderItems.product', 'name image price'); // Include price as per admin controller

    if (!order) {
      throw createError(404, "Order not found");
    }

    // Security check: ensure the user requesting the order is the one who created it, or an admin
    if (order.customer._id.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: "Not authorized to view this order" });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};