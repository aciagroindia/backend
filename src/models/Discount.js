const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['Percentage', 'Fixed Amount', 'Shipping', 'BOGO'],
    },
    value: {
        type: Number,
        required: true,
    },
    conditionType: {
        type: String,
        enum: ['ALL_ORDERS', 'FIRST_ORDER', 'MIN_ORDER_VALUE', 'SPECIFIC_PRODUCTS'],
        default: 'ALL_ORDERS',
    },
    minOrderAmount: {
        type: Number,
        default: 0,
    },
    maxDiscountAmount: {
        type: Number,
        default: null,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
    }],
}, { timestamps: true });

module.exports = mongoose.model('Discount', discountSchema);