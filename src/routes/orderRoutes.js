const express = require("express");
const router = express.Router();

const {
  createOrder,
  previewOrderDiscount,
  verifyPayment, 
  handleCashfreeWebhook,
  verifyCashfreeOrder,
  retryCashfreePayment,
  handlePayUResponse,
  verifyPayUResponseJSON,
  retryPayUPayment,
  getMyOrders,
  getOrderById,
  cancelMyOrder
} = require("../controllers/orderController");

const { shiprocketWebhook } = require('../controllers/adminOrderController');
const { protect } = require("../middlewares/authMiddleware");
const { validate } = require("../middlewares/validationMiddleware");

const {
  createOrderSchema,
  getOrderByIdSchema,
} = require("../validations/order.validation");

// ==========================================
// 🔔 SHIPROCKET & CASHFREE WEBHOOK ROUTES
// Dhyan de: Webhook routes par protect middleware nahi lagta
// ==========================================
router.post("/webhook/shiprocket", shiprocketWebhook);
router.post("/cashfree-webhook", handleCashfreeWebhook);
router.post("/webhook/cashfree", handleCashfreeWebhook);

// ==========================================
// 💳 CASHFREE VERIFICATION & RETRY ROUTES
// ==========================================
router.post("/cashfree-verify", verifyCashfreeOrder);
router.post("/:id/cashfree-retry", protect, retryCashfreePayment);

// ==========================================
// 💳 PAYU CALLBACK / RESPONSE ROUTES (Backward compatibility)
// ==========================================
router.post("/payu-response", handlePayUResponse);
router.post("/payu-callback", handlePayUResponse);
router.post("/payu-success", handlePayUResponse);
router.post("/payu-failure", handlePayUResponse);
router.post("/payu-verify", verifyPayUResponseJSON);

// preview automatic discount
router.post("/preview-discount", protect, previewOrderDiscount);

// create order
router.post("/", protect, validate(createOrderSchema), createOrder);

// Retry PayU payment for pending order
router.post("/:id/payu-retry", protect, retryPayUPayment);

// Legacy Razorpay verify payment
router.post("/pay", protect, verifyPayment);

// user orders
router.get("/my-orders", protect, getMyOrders);

// single order
router.get("/:id", protect, validate(getOrderByIdSchema, "params"), getOrderById);

// Cancel pending order route
router.put("/:id/cancel", protect, cancelMyOrder);

module.exports = router;