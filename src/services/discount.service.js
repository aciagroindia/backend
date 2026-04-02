const Discount = require('../models/Discount');
const createError = require('http-errors');

exports.getAllDiscounts = async () => {
    const discounts = await Discount.find({}).populate('products', 'name').sort({ createdAt: -1 });
    return discounts;
};

exports.createDiscount = async (data) => {
    const discount = await Discount.create(data);
    return discount;
};

exports.updateDiscount = async (discountId, data) => {
    const discount = await Discount.findByIdAndUpdate(discountId, data, { new: true, runValidators: true });
    if (!discount) {
        throw createError(404, 'Discount not found');
    }
    return discount;
};

exports.deleteDiscount = async (discountId) => {
    const discount = await Discount.findByIdAndDelete(discountId);
    if (!discount) {
        throw createError(404, 'Discount not found');
    }
    return { message: 'Discount deleted successfully' };
};