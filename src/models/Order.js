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
    totalAmount: {
        type: Number,
        required: true,
    },
    orderStatus: {
        type: String,
        required: true,
        enum: ['created', 'pending', 'processing', 'confirmed', 'shipped', 'out for delivery', 'delivered', 'cancelled'],
        default: 'created',
    },
    trackingId: {
        type: String,
    },
    courierName: {
        type: String,
    },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);