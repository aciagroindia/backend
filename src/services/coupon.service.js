const Coupon = require('../models/Coupon');
const createError = require('http-errors');

exports.getAllCoupons = async () => {
    return await Coupon.find({}).sort({ createdAt: -1 });
};

exports.getCouponById = async (id) => {
    const coupon = await Coupon.findById(id);
    if (!coupon) throw createError(404, 'Coupon not found');
    return coupon;
};

exports.createCoupon = async (data) => {
    const exists = await Coupon.findOne({ code: data.code });
    if (exists) throw createError(400, 'Coupon code already exists');
    return await Coupon.create(data);
};

exports.updateCoupon = async (id, data) => {
    const coupon = await Coupon.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!coupon) throw createError(404, 'Coupon not found');
    return coupon;
};

exports.deleteCoupon = async (id) => {
    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) throw createError(404, 'Coupon not found');
    return { message: 'Coupon deleted successfully' };
};
