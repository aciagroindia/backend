const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    discountType: {
        type: String,
        required: true,
        enum: ['Percentage', 'FixedAmount']
    },
    discountValue: {
        type: Number,
        required: true
    },
    usageCount: {
        type: Number,
        default: 0
    },
    usageLimit: {
        type: Number,
        default: 100
    },
    expiryDate: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
