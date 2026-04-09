const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require("../models/Order");
const Cart = require("../models/cart.model");
const Product = require("../models/Product");
const Notification = require("../models/Notification");
const createError = require("http-errors");

const razorpay = new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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

    // 1. RAZORPAY ORDER CREATE KARNA (Agar prepaid hai)
    let rzpOrder = null;
    if (paymentMethod !== 'COD') {
        const options = {
            amount: Math.round(serverCalculatedTotal * 100), // Paise me convert
            currency: "INR",
            receipt: `rcpt_${Date.now()}`
        };
        rzpOrder = await razorpay.orders.create(options);
    }

    // 2. MONGODB ME ORDER CREATE KARNA
    const order = await Order.create({
      customer: req.user.id,
      orderItems,
      shippingInfo: shippingAddress,
      totalAmount: serverCalculatedTotal,
      paymentMethod: paymentMethod || 'Razorpay',
      paymentStatus: 'pending', 
      orderStatus: paymentMethod === 'COD' ? 'processing' : 'created', // COD Fix
      razorpay_order_id: rzpOrder ? rzpOrder.id : null, 
    });

    // 3. AGAR COD HAI, TOH STOCK AUR CART YAHIN UPDATE KAREIN
    if (paymentMethod === 'COD') {
        const bulkStockUpdate = orderItems.map(item => ({
            updateOne: {
                filter: { _id: item.product },
                update: { $inc: { stock: -item.quantity, numSales: item.quantity, salesCount: item.quantity } }
            }
        }));
        await Product.bulkWrite(bulkStockUpdate);

        await Notification.create({
            type: "order",
            text: `New COD order received #${order._id.toString().slice(-4)}`,
            link: "/admin/orders"
        });

        if (req.body.clearCart !== false) {
            await Cart.updateOne({ user: req.user.id }, { $set: { items: [] } });
        }
    }

    res.status(201).json({ 
        success: true, 
        data: order,
        razorpayOrderId: rzpOrder ? rzpOrder.id : null
    });
  } catch (error) {
    next(error);
  }
};

// VERIFY PAYMENT (For Razorpay Only)
exports.verifyPayment = async (req, res, next) => {
  try {
      const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature, clearCart } = req.body;

      // 1. SIGNATURE VERIFY KARNA (Security)
      const sign = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSign = crypto
          .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
          .update(sign.toString())
          .digest("hex");

      if (razorpay_signature !== expectedSign) {
          return res.status(400).json({ success: false, message: "Payment verification failed! Fake attempt." });
      }

      // 2. MONGODB ME ORDER UPDATE KARNA
      const order = await Order.findByIdAndUpdate(
          orderId,
          {
              paymentStatus: "paid",
              orderStatus: "processing",
              razorpay_payment_id,
              razorpay_signature
          },
          { new: true }
      );

      if (!order) {
          throw createError(404, "Order not found");
      }

      // 3. PREPAID ORDER KE LIYE STOCK MINUS, NOTIFICATION AUR CART CLEAR
      const bulkStockUpdate = order.orderItems.map(item => ({
          updateOne: {
              filter: { _id: item.product },
              update: { $inc: { stock: -item.quantity, numSales: item.quantity, salesCount: item.quantity } }
          }
      }));
      await Product.bulkWrite(bulkStockUpdate);

      await Notification.create({
          type: "order",
          text: `New Prepaid order received #${order._id.toString().slice(-4)}`,
          link: "/admin/orders"
      });

      if (clearCart !== false) {
           await Cart.updateOne({ user: order.customer }, { $set: { items: [] } });
      }

    res.json({
      success: true,
      message: "Payment successful and verified",
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// GET MY ORDERS
exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
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
      .populate('customer', 'name email')
      .populate('orderItems.product', 'name image price');

    if (!order) {
      throw createError(404, "Order not found");
    }

    if (order.customer._id.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'owner') {
        return res.status(403).json({ success: false, message: "Not authorized to view this order" });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// GET ALL ADMIN ORDERS (Strictly Filtered)
exports.getAllAdminOrders = async (req, res, next) => {
    try {
      const orders = await Order.find({
          $or: [
              { paymentMethod: 'COD' },
              { paymentStatus: 'paid' }
          ]
      })
      .populate('customer', 'name email')
      .sort({ createdAt: -1 });
  
      res.json({ success: true, count: orders.length, data: orders });
    } catch (error) {
      next(error);
    }
};

// ==========================================
// NEW: CANCEL PENDING ONLINE ORDER (Customer)
// ==========================================
exports.cancelMyOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Security: Check if order belongs to the user
        if (order.customer.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: "Not authorized to cancel this order" });
        }

        // Security: Paid ya COD order user cancel nahi kar sakta
        if (order.paymentStatus === 'paid' || order.paymentMethod === 'COD') {
            return res.status(400).json({ 
                success: false, 
                message: "You cannot cancel a confirmed order. Please contact support." 
            });
        }

        // Agar order pehle hi cancel ho chuka hai
        if (order.orderStatus === 'cancelled') {
            return res.status(400).json({ success: false, message: "Order is already cancelled." });
        }

        // Cancel it!
        order.orderStatus = 'cancelled';
        await order.save();

        res.json({ success: true, message: "Order cancelled successfully." });
    } catch (error) {
        next(error);
    }
};