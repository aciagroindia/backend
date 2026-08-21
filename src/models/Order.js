const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    name: String, // Added product name to order item
    image: String, // Added product image to order item
    quantity: {
        type: Number,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
});

const shippingInfoSchema = new mongoose.Schema({
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    pinCode: { type: String, required: true },
});

const orderSchema = new mongoose.Schema({
    customer: { // Changed from 'user' to 'customer' as per requirement
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    orderItems: [orderItemSchema],
    shippingInfo: {
        type: shippingInfoSchema,
        required: true,
    },
    deliveredAt: { type: Date },
    subtotal: {
        type: Number,
    },
    discountAmount: {
        type: Number,
        default: 0,
    },
    appliedDiscount: {
        discountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Discount' },
        name: String,
        type: { type: String },
        value: Number,
    },
    coupon: {
        couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
        code: String,
        discountAmount: { type: Number, default: 0 },
    },
    totalAmount: {
        type: Number,
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        required: true,
        default: 'PayU' // 'PayU', 'Razorpay', ya 'COD'
    },
    // Historical Razorpay fields (Preserved for backward compatibility)
    razorpay_order_id: { type: String },
    razorpay_payment_id: { type: String },
    razorpay_signature: { type: String },
    // PayU Payment fields
    payu_txnid: { type: String },
    payu_mihpayid: { type: String },
    payu_mode: { type: String },
    payu_status: { type: String },
    payu_response: { type: mongoose.Schema.Types.Mixed },
    orderStatus: {
        type: String,
        required: true,
        enum: ['created', 'pending', 'processing', 'confirmed', 'shipped', 'out for delivery', 'delivered', 'cancelled'],
        default: 'created',
    },
    trackingId: {
        type: String,
    },
    shiprocketOrderId: { // 👈 Ye naya add karna hai
        type: String,
    },
    courierName: {
        type: String,
    },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);