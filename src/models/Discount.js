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
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
    }],
}, { timestamps: true });

module.exports = mongoose.model('Discount', discountSchema);