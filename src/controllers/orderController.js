const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require("../models/Order");
const Cart = require("../models/cart.model");
const Product = require("../models/Product");
const Notification = require("../models/Notification");
const createError = require("http-errors");
const {
  buildPaymentPayload,
  verifyResponseHash,
  verifyPaymentServerToServer,
  getPayUConfig,
} = require("../services/payuService");
const {
  createCashfreeOrder,
  verifyCashfreePayment,
  verifyWebhookSignature,
} = require("../services/cashfreeService");
const {
  calculateBestAutomaticDiscount,
} = require("../services/discountCalculation.service");
const couponService = require("../services/coupon.service");

let razorpay = null;
const rzpKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;

if (rzpKeyId && rzpKeySecret) {
  try {
    razorpay = new Razorpay({
      key_id: rzpKeyId,
      key_secret: rzpKeySecret,
    });
  } catch (e) {
    console.warn("Legacy Razorpay initialization skipped:", e.message);
  }
}

// ==========================================
// PREVIEW AUTOMATIC DISCOUNT & COUPON
// ==========================================
exports.previewOrderDiscount = async (req, res, next) => {
  try {
    const { items, couponCode } = req.body;
    if (!items || items.length === 0) {
      return res.json({
        success: true,
        data: {
          subtotal: 0,
          discountAmount: 0,
          couponDiscount: 0,
          finalTotal: 0,
          appliedDiscount: null,
          appliedCoupon: null,
        },
      });
    }

    // Fetch DB products for accurate server pricing
    const productIds = items.map(item => item.productId || item.product || item._id);
    const productsFromDB = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(productsFromDB.map(p => [p._id.toString(), p]));

    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const pId = (item.productId || item.product || item._id || '').toString();
      const product = productMap.get(pId);
      if (product) {
        const qty = item.quantity || item.qty || 1;
        subtotal += product.price * qty;
        validatedItems.push({
          productId: product._id,
          price: product.price,
          quantity: qty,
        });
      }
    }

    const discountResult = await calculateBestAutomaticDiscount(
      req.user ? req.user.id : null,
      validatedItems,
      subtotal
    );

    let couponDiscount = 0;
    let appliedCoupon = null;

    if (couponCode && couponCode.trim()) {
      try {
        const remainingSubtotal = Math.max(0, subtotal - discountResult.discountAmount);
        const couponResult = await couponService.validateAndApplyCoupon(
          couponCode,
          req.user ? req.user.id : null,
          remainingSubtotal
        );
        couponDiscount = couponResult.discountAmount;
        appliedCoupon = {
          couponId: couponResult.couponId,
          code: couponResult.code,
          discountAmount: couponDiscount,
        };
      } catch (cErr) {
        // Invalid coupon during preview
        appliedCoupon = { error: cErr.message };
      }
    }

    const finalTotal = Math.max(0, Math.round((subtotal - discountResult.discountAmount - couponDiscount) * 100) / 100);

    res.json({
      success: true,
      data: {
        ...discountResult,
        couponDiscount,
        appliedCoupon,
        finalTotal,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CREATE ORDER
// ==========================================
exports.createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod, isBuyNow, couponCode } = req.body;

    // --- Server-Side Price & Stock Verification ---
    const productIds = items.map(item => item.productId || item.product);
    const productsFromDB = await Product.find({ _id: { $in: productIds } });

    const productMap = new Map(productsFromDB.map(p => [p._id.toString(), p]));

    let serverCalculatedTotal = 0;
    const orderItems = [];

    for (const item of items) {
      const pId = (item.productId || item.product || '').toString();
      const product = productMap.get(pId);

      if (!product) {
        throw createError(404, `Product with ID ${pId} not found.`);
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

    // --- Server-Side Automatic Discount Evaluation ---
    const discountResult = await calculateBestAutomaticDiscount(
      req.user ? req.user.id : null,
      orderItems,
      serverCalculatedTotal
    );

    // --- Server-Side Coupon Evaluation (if provided) ---
    let couponData = null;
    let couponDiscount = 0;

    if (couponCode && couponCode.trim()) {
      const remainingSubtotal = Math.max(0, serverCalculatedTotal - discountResult.discountAmount);
      const couponResult = await couponService.validateAndApplyCoupon(
        couponCode,
        req.user ? req.user.id : null,
        remainingSubtotal
      );
      couponDiscount = couponResult.discountAmount;
      couponData = {
        couponId: couponResult.couponId,
        code: couponResult.code,
        discountAmount: couponDiscount,
      };
    }

    const finalPayableTotal = Math.max(
      0,
      Math.round((serverCalculatedTotal - discountResult.discountAmount - couponDiscount) * 100) / 100
    );

    const selectedMethod = paymentMethod || 'Cashfree';

    // 1. MONGODB ME ORDER CREATE KARNA
    const order = await Order.create({
      customer: req.user.id,
      orderItems,
      shippingInfo: shippingAddress,
      subtotal: serverCalculatedTotal,
      discountAmount: discountResult.discountAmount,
      appliedDiscount: discountResult.appliedDiscount,
      coupon: couponData,
      totalAmount: finalPayableTotal,
      paymentMethod: selectedMethod,
      paymentStatus: 'pending',
      orderStatus: selectedMethod === 'COD' ? 'processing' : 'created',
    });

    // 2. AGAR COD HAI, TOH STOCK, CART AUR COUPON USAGE YAHIN UPDATE KAREIN
    if (selectedMethod === 'COD') {
      const bulkStockUpdate = orderItems.map(item => ({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { stock: -item.quantity, numSales: item.quantity, salesCount: item.quantity } }
        }
      }));
      await Product.bulkWrite(bulkStockUpdate);

      // Record coupon usage
      if (couponData && couponData.couponId) {
        await couponService.recordCouponUsage(couponData.couponId, req.user.id);
      }

      await Notification.create({
        type: "order",
        text: `New COD order received #${order._id.toString().slice(-4)}`,
        link: "/admin/orders"
      });

      if (req.body.clearCart !== false && !isBuyNow) {
        await Cart.updateOne({ user: req.user.id }, { $set: { items: [] } });
      }

      return res.status(201).json({
        success: true,
        data: order,
      });
    }

    // 3. AGAR CASHFREE HAI (Primary Online Gateway)
    if (selectedMethod === 'Cashfree') {
      try {
        const cfResult = await createCashfreeOrder({
          order,
          user: req.user,
          isBuyNow: Boolean(isBuyNow),
        });

        order.cashfree_order_id = cfResult.order_id;
        order.cashfree_payment_session_id = cfResult.payment_session_id;
        order.cashfree_status = cfResult.order_status;
        await order.save();

        return res.status(201).json({
          success: true,
          data: order,
          cashfree: {
            payment_session_id: cfResult.payment_session_id,
            cf_order_id: cfResult.cf_order_id,
            order_id: cfResult.order_id,
            environment: cfResult.environment,
          },
        });
      } catch (cfErr) {
        console.error('[Cashfree Order Generation Error]:', cfErr.message);
        throw createError(500, `Failed to initialize Cashfree payment: ${cfErr.message}`);
      }
    }

    // 4. LEGACY PAYU COMPATIBILITY (Agar explicitly PayU select ho)
    if (selectedMethod === 'PayU') {
      const payuPayload = buildPaymentPayload({
        order,
        user: req.user,
        isBuyNow: Boolean(isBuyNow),
      });

      // Transaction ID ko order me save karein
      order.payu_txnid = payuPayload.txnid;
      await order.save();

      return res.status(201).json({
        success: true,
        data: order,
        payu: payuPayload,
      });
    }

    // 4. LEGACY RAZORPAY COMPATIBILITY (Agar user explicitly Razorpay use kar raha ho)
    if (selectedMethod === 'Razorpay') {
      if (!razorpay) {
        throw createError(400, "Razorpay is not configured on this server. Please use PayU or COD.");
      }
      const options = {
        amount: Math.round(finalPayableTotal * 100),
        currency: "INR",
        receipt: `rcpt_${Date.now()}`
      };
      const rzpOrder = await razorpay.orders.create(options);
      order.razorpay_order_id = rzpOrder ? rzpOrder.id : null;
      await order.save();

      return res.status(201).json({
        success: true,
        data: order,
        razorpayOrderId: rzpOrder ? rzpOrder.id : null,
      });
    }

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PAYU CALLBACK / RESPONSE HANDLER (Server-Side SURL/FURL)
// ==========================================
exports.handlePayUResponse = async (req, res, next) => {
  try {
    const responseData = req.body;
    const { frontendUrl } = getPayUConfig();

    const {
      status,
      txnid,
      amount,
      mihpayid,
      udf1: orderId,
      udf3: isBuyNow,
      hash,
      mode,
      error_Message,
    } = responseData;

    console.log(`[PayU Callback] Received response for TxnID: ${txnid}, OrderID: ${orderId}, Status: ${status}`);

    // 1. REVERSE HASH SECURITY VERIFICATION
    const isHashValid = verifyResponseHash(responseData);

    if (!isHashValid) {
      console.error(`[PayU Security Alert] Invalid reverse hash received for TxnID: ${txnid}`);
      
      // Update order if found
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: 'failed',
          payu_status: 'hash_mismatch_failed',
          payu_response: responseData,
        });
      }

      return res.redirect(`${frontendUrl}/orders?status=failed&reason=security_verification_failed`);
    }

    // 2. FIND ORDER
    const order = await Order.findOne({
      $or: [
        { _id: orderId },
        { payu_txnid: txnid }
      ]
    });

    if (!order) {
      console.error(`[PayU Error] Order not found for TxnID: ${txnid}, OrderID: ${orderId}`);
      return res.redirect(`${frontendUrl}/orders?status=failed&reason=order_not_found`);
    }

    // 3. IDEMPOTENCY CHECK: If already paid, do not re-decrement stock or resend notification
    if (order.paymentStatus === 'paid') {
      console.log(`[PayU Idempotency] Order #${order._id} already marked as paid. Skipping re-processing.`);
      return res.redirect(`${frontendUrl}/orders?status=success&orderId=${order._id}`);
    }

    // 4. AMOUNT VERIFICATION
    const paidAmount = parseFloat(amount);
    const expectedAmount = parseFloat(order.totalAmount);

    if (Math.abs(paidAmount - expectedAmount) > 0.01) {
      console.error(`[PayU Security Alert] Amount mismatch for Order #${order._id}: Expected ${expectedAmount}, Paid ${paidAmount}`);
      order.paymentStatus = 'failed';
      order.payu_status = 'amount_mismatch_failed';
      order.payu_response = responseData;
      await order.save();
      return res.redirect(`${frontendUrl}/orders?status=failed&reason=amount_mismatch`);
    }

    // 5. PROCESS SUCCESSFUL PAYMENT
    if (status === 'success') {
      order.paymentStatus = 'paid';
      order.orderStatus = 'processing';
      order.payu_txnid = txnid;
      order.payu_mihpayid = mihpayid;
      order.payu_mode = mode || 'Online';
      order.payu_status = 'success';
      order.payu_response = responseData;
      await order.save();

      // Product stock deduct & sales counter update
      const bulkStockUpdate = order.orderItems.map(item => ({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { stock: -item.quantity, numSales: item.quantity, salesCount: item.quantity } }
        }
      }));
      await Product.bulkWrite(bulkStockUpdate);

      // Notification
      await Notification.create({
        type: "order",
        text: `New Prepaid order received #${order._id.toString().slice(-4)}`,
        link: "/admin/orders"
      });

      // Clear user cart if not buy now
      if (isBuyNow !== 'true') {
        await Cart.updateOne({ user: order.customer }, { $set: { items: [] } });
      }

      // Record coupon usage if applied
      if (order.coupon && order.coupon.couponId) {
        await couponService.recordCouponUsage(order.coupon.couponId, order.customer);
      }

      console.log(`[PayU Success] Order #${order._id} successfully confirmed and paid.`);
      return res.redirect(`${frontendUrl}/orders?status=success&orderId=${order._id}`);
    } else {
      // 6. PROCESS FAILED / CANCELLED PAYMENT
      order.paymentStatus = 'failed';
      order.payu_txnid = txnid;
      order.payu_mihpayid = mihpayid;
      order.payu_status = status || 'failure';
      order.payu_response = responseData;
      await order.save();

      console.log(`[PayU Failure] Payment failed/cancelled for Order #${order._id}. Error: ${error_Message || 'Unknown'}`);
      return res.redirect(`${frontendUrl}/orders?status=failed&orderId=${order._id}`);
    }
  } catch (error) {
    console.error("[PayU Callback Exception]:", error);
    const { frontendUrl } = getPayUConfig();
    return res.redirect(`${frontendUrl}/orders?status=failed&reason=server_error`);
  }
};

// ==========================================
// PAYU VERIFY JSON (For Bolt Popup Overlay)
// ==========================================
exports.verifyPayUResponseJSON = async (req, res, next) => {
  try {
    const responseData = req.body;

    const {
      status,
      txnid,
      amount,
      mihpayid,
      udf1: orderId,
      udf3: isBuyNow,
      hash,
      mode,
      error_Message,
    } = responseData;

    console.log(`[PayU Bolt Verify] Received JSON response for TxnID: ${txnid}, OrderID: ${orderId}, Status: ${status}`);

    // 1. REVERSE HASH SECURITY VERIFICATION
    const isHashValid = verifyResponseHash(responseData);

    if (!isHashValid) {
      console.error(`[PayU Security Alert] Invalid reverse hash received for TxnID: ${txnid}`);
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: 'failed',
          payu_status: 'hash_mismatch_failed',
          payu_response: responseData,
        });
      }
      return res.status(400).json({ success: false, message: "Security verification failed! Invalid signature hash." });
    }

    // 2. FIND ORDER
    const order = await Order.findOne({
      $or: [
        { _id: orderId },
        { payu_txnid: txnid }
      ]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // 3. IDEMPOTENCY CHECK
    if (order.paymentStatus === 'paid') {
      return res.json({ success: true, message: "Order already verified and paid", data: { order } });
    }

    // 4. AMOUNT VERIFICATION
    const paidAmount = parseFloat(amount);
    const expectedAmount = parseFloat(order.totalAmount);

    if (Math.abs(paidAmount - expectedAmount) > 0.01) {
      order.paymentStatus = 'failed';
      order.payu_status = 'amount_mismatch_failed';
      order.payu_response = responseData;
      await order.save();
      return res.status(400).json({ success: false, message: "Payment amount mismatch detected!" });
    }

    // 5. PROCESS SUCCESSFUL PAYMENT
    if (status === 'success') {
      order.paymentStatus = 'paid';
      order.orderStatus = 'processing';
      order.payu_txnid = txnid;
      order.payu_mihpayid = mihpayid;
      order.payu_mode = mode || 'Online';
      order.payu_status = 'success';
      order.payu_response = responseData;
      await order.save();

      // Product stock deduct & sales counter update
      const bulkStockUpdate = order.orderItems.map(item => ({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { stock: -item.quantity, numSales: item.quantity, salesCount: item.quantity } }
        }
      }));
      await Product.bulkWrite(bulkStockUpdate);

      // Notification
      await Notification.create({
        type: "order",
        text: `New Prepaid order received #${order._id.toString().slice(-4)}`,
        link: "/admin/orders"
      });

      // Clear user cart if not buy now
      if (isBuyNow !== 'true') {
        await Cart.updateOne({ user: order.customer }, { $set: { items: [] } });
      }

      // Record coupon usage if applied
      if (order.coupon && order.coupon.couponId) {
        await couponService.recordCouponUsage(order.coupon.couponId, order.customer);
      }

      return res.json({ success: true, message: "Payment successful and verified", data: { order } });
    } else {
      order.paymentStatus = 'failed';
      order.payu_txnid = txnid;
      order.payu_mihpayid = mihpayid;
      order.payu_status = status || 'failure';
      order.payu_response = responseData;
      await order.save();

      return res.status(400).json({ success: false, message: error_Message || "Payment was not successful" });
    }
  } catch (error) {
    next(error);
  }
};

// ==========================================
// RETRY PAYU PAYMENT (For Pending Orders)
// ==========================================
exports.retryPayUPayment = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Security: Check if order belongs to customer
    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized to access this order" });
    }

    // Check if already paid or COD
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: "Order is already paid" });
    }

    if (order.paymentMethod === 'COD') {
      return res.status(400).json({ success: false, message: "Cash on Delivery orders cannot be paid online" });
    }

    // Generate new PayU payload with unique transaction id
    const payuPayload = buildPaymentPayload({
      order,
      user: req.user,
      isBuyNow: false,
    });

    order.payu_txnid = payuPayload.txnid;
    order.paymentMethod = 'PayU';
    await order.save();

    res.json({
      success: true,
      payu: payuPayload,
      order,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// LEGACY VERIFY PAYMENT (For Razorpay Only)
// ==========================================
exports.verifyPayment = async (req, res, next) => {
  try {
    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature, clearCart } = req.body;

    // 1. SIGNATURE VERIFY KARNA (Security)
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
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

// ==========================================
// GET MY ORDERS
// ==========================================
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

// ==========================================
// GET ORDER BY ID
// ==========================================
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

// ==========================================
// GET ALL ADMIN ORDERS (Strictly Filtered)
// ==========================================
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
// CANCEL PENDING ONLINE ORDER (Customer)
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

// ==========================================
// CASHFREE WEBHOOK HANDLER
// ==========================================
exports.handleCashfreeWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const rawBody = req.body;

    console.log(`[Cashfree Webhook] Received notification at timestamp: ${timestamp}`);

    // 1. Verify Signature
    const isSignatureValid = verifyWebhookSignature(signature, rawBody, timestamp);
    if (!isSignatureValid) {
      console.warn('[Cashfree Webhook Alert] Signature verification failed or missing secret key.');
    }

    const eventType = rawBody.type;
    const eventData = rawBody.data || {};
    const orderData = eventData.order || {};
    const paymentData = eventData.payment || {};

    const cfOrderId = orderData.order_id || eventData.order_id;
    const mongoOrderId = orderData.order_tags?.mongo_order_id;
    const isBuyNow = orderData.order_tags?.is_buy_now;
    const paymentStatus = paymentData.payment_status || orderData.order_status;

    console.log(`[Cashfree Webhook] Event: ${eventType}, OrderID: ${cfOrderId}, PaymentStatus: ${paymentStatus}`);

    // 2. Find Order
    const order = await Order.findOne({
      $or: [
        { cashfree_order_id: cfOrderId },
        ...(mongoOrderId ? [{ _id: mongoOrderId }] : []),
      ],
    });

    if (!order) {
      console.error(`[Cashfree Webhook] Order not found for cfOrderId: ${cfOrderId}`);
      return res.status(200).json({ status: "acknowledged", message: "Order not found" });
    }

    // 3. Idempotency Check
    if (order.paymentStatus === 'paid') {
      console.log(`[Cashfree Webhook Idempotency] Order #${order._id} already marked as paid.`);
      return res.status(200).json({ status: "acknowledged", message: "Already processed" });
    }

    // 4. Process Successful Payment
    if (eventType === 'PAYMENT_SUCCESS_WEBHOOK' || paymentStatus === 'SUCCESS' || paymentStatus === 'PAID') {
      // Amount verification
      const paidAmount = Number(paymentData.payment_amount || orderData.order_amount || 0);
      const expectedAmount = Number(order.totalAmount);

      if (paidAmount > 0 && Math.abs(paidAmount - expectedAmount) > 0.5) {
        console.error(`[Cashfree Security Alert] Webhook amount mismatch for Order #${order._id}: expected ₹${expectedAmount}, received ₹${paidAmount}`);
        order.paymentStatus = 'failed';
        order.cashfree_status = 'amount_mismatch_failed';
        order.cashfree_response = rawBody;
        await order.save();
        return res.status(200).json({ status: "acknowledged", message: "Amount mismatch" });
      }

      order.paymentStatus = 'paid';
      order.orderStatus = 'processing';
      order.cashfree_status = 'PAID';
      order.cashfree_payment_id = paymentData.cf_payment_id ? String(paymentData.cf_payment_id) : undefined;
      order.cashfree_response = rawBody;
      await order.save();

      // Product stock deduct & sales counter update
      const bulkStockUpdate = order.orderItems.map(item => ({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { stock: -item.quantity, numSales: item.quantity, salesCount: item.quantity } }
        }
      }));
      await Product.bulkWrite(bulkStockUpdate);

      // Notification
      await Notification.create({
        type: "order",
        text: `New Prepaid order received #${order._id.toString().slice(-4)}`,
        link: "/admin/orders"
      });

      // Clear user cart if not buy now
      if (isBuyNow !== 'true') {
        await Cart.updateOne({ user: order.customer }, { $set: { items: [] } });
      }

      // Record coupon usage if applied
      if (order.coupon && order.coupon.couponId) {
        await couponService.recordCouponUsage(order.coupon.couponId, order.customer);
      }

      console.log(`[Cashfree Webhook Success] Order #${order._id} confirmed and marked as PAID.`);
    } else if (eventType === 'PAYMENT_FAILED_WEBHOOK' || paymentStatus === 'FAILED') {
      order.paymentStatus = 'failed';
      order.cashfree_status = 'FAILED';
      order.cashfree_response = rawBody;
      await order.save();
      console.log(`[Cashfree Webhook Failure] Order #${order._id} payment failed.`);
    }

    return res.status(200).json({ status: "acknowledged" });
  } catch (error) {
    console.error("[Cashfree Webhook Exception]:", error);
    return res.status(200).json({ status: "error", message: error.message });
  }
};

// ==========================================
// VERIFY CASHFREE ORDER (S2S from Frontend return)
// ==========================================
exports.verifyCashfreeOrder = async (req, res, next) => {
  try {
    const { orderId, cfOrderId } = req.body;
    const searchId = cfOrderId || orderId;

    if (!searchId) {
      return res.status(400).json({ success: false, message: "Order ID is required for verification." });
    }

    const isValidObjectId = typeof searchId === 'string' && searchId.match(/^[0-9a-fA-F]{24}$/);
    const order = await Order.findOne({
      $or: [
        { cashfree_order_id: searchId },
        ...(isValidObjectId ? [{ _id: searchId }] : []),
      ],
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.paymentStatus === 'paid') {
      return res.json({ success: true, message: "Order already verified and paid", data: { order } });
    }

    // Call Cashfree S2S API
    const cfLookupId = order.cashfree_order_id || searchId;
    const cfVerifyResult = await verifyCashfreePayment(cfLookupId);

    if (cfVerifyResult.success && cfVerifyResult.isPaid) {
      // Amount verification
      const paidAmount = Number(cfVerifyResult.orderAmount || 0);
      const expectedAmount = Number(order.totalAmount);

      if (paidAmount > 0 && Math.abs(paidAmount - expectedAmount) > 0.5) {
        console.error(`[Cashfree Security Alert] S2S Amount mismatch for Order #${order._id}: expected ₹${expectedAmount}, received ₹${paidAmount}`);
        order.paymentStatus = 'failed';
        order.cashfree_status = 'amount_mismatch_failed';
        order.cashfree_response = cfVerifyResult.data;
        await order.save();
        return res.status(400).json({ success: false, message: "Payment amount mismatch detected!" });
      }

      order.paymentStatus = 'paid';
      order.orderStatus = 'processing';
      order.cashfree_status = 'PAID';
      order.cashfree_response = cfVerifyResult.data;
      await order.save();

      // Product stock deduct & sales counter update
      const bulkStockUpdate = order.orderItems.map(item => ({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { stock: -item.quantity, numSales: item.quantity, salesCount: item.quantity } }
        }
      }));
      await Product.bulkWrite(bulkStockUpdate);

      // Notification
      await Notification.create({
        type: "order",
        text: `New Prepaid order received #${order._id.toString().slice(-4)}`,
        link: "/admin/orders"
      });

      // Clear user cart if not buy now
      const isBuyNow = cfVerifyResult.orderTags?.is_buy_now === 'true';
      if (!isBuyNow) {
        await Cart.updateOne({ user: order.customer }, { $set: { items: [] } });
      }

      // Record coupon usage if applied
      if (order.coupon && order.coupon.couponId) {
        await couponService.recordCouponUsage(order.coupon.couponId, order.customer);
      }

      return res.json({ success: true, message: "Payment verified successfully", data: { order } });
    }

    return res.json({
      success: false,
      message: cfVerifyResult.message || `Payment status is ${cfVerifyResult.orderStatus || 'pending'}`,
      data: { order, status: cfVerifyResult.orderStatus },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// RETRY CASHFREE PAYMENT (For Pending Orders)
// ==========================================
exports.retryCashfreePayment = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized to access this order" });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: "Order is already paid" });
    }

    if (order.paymentMethod === 'COD') {
      return res.status(400).json({ success: false, message: "Cash on Delivery orders cannot be paid online" });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: "This order has been cancelled and cannot be paid." });
    }

    // Check stock availability before initiating payment
    const productIds = order.orderItems.map(item => item.product);
    const currentProducts = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(currentProducts.map(p => [p._id.toString(), p]));

    for (const item of order.orderItems) {
      const p = productMap.get(item.product.toString());
      if (!p) {
        return res.status(400).json({ success: false, message: `Product ${item.name} is no longer available.` });
      }
      if (p.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${item.name}. Only ${p.stock} remaining.` });
      }
    }

    // Generate new Cashfree order session
    const cfResult = await createCashfreeOrder({
      order,
      user: req.user,
      isBuyNow: false,
    });

    order.cashfree_order_id = cfResult.order_id;
    order.cashfree_payment_session_id = cfResult.payment_session_id;
    order.cashfree_status = cfResult.order_status;
    order.paymentMethod = 'Cashfree';
    await order.save();

    res.json({
      success: true,
      cashfree: {
        payment_session_id: cfResult.payment_session_id,
        cf_order_id: cfResult.cf_order_id,
        order_id: cfResult.order_id,
        environment: cfResult.environment,
      },
      order,
    });
  } catch (error) {
    next(error);
  }
};