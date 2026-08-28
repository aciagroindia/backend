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
    name: { type: String },
    phone: { type: String },
    phoneNo: { type: String },
    email: { type: String },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true, default: 'India' },
    pinCode: { type: String, required: true },
    postalCode: { type: String },
}, { _id: false });


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
        default: 'Cashfree' // 'Cashfree', 'PayU', 'Razorpay', ya 'COD'
    },
    // Cashfree Payment fields
    cashfree_order_id: { type: String },
    cashfree_payment_session_id: { type: String },
    cashfree_payment_id: { type: String },
    cashfree_status: { type: String },
    cashfree_response: { type: mongoose.Schema.Types.Mixed },
    // Historical PayU Payment fields (Preserved for backward compatibility)
    payu_txnid: { type: String },
    payu_mihpayid: { type: String },
    payu_mode: { type: String },
    payu_status: { type: String },
    payu_response: { type: mongoose.Schema.Types.Mixed },
    // Historical Razorpay fields (Preserved for backward compatibility)
    razorpay_order_id: { type: String },
    razorpay_payment_id: { type: String },
    razorpay_signature: { type: String },
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