const couponService = require('../services/coupon.service');

exports.getCoupons = async (req, res, next) => {
    try {
        const coupons = await couponService.getAllCoupons();
        res.json({ success: true, data: coupons });
    } catch (error) {
        next(error);
    }
};

exports.createCoupon = async (req, res, next) => {
    try {
        const coupon = await couponService.createCoupon(req.body);
        res.status(201).json({ success: true, data: coupon });
    } catch (error) {
        next(error);
    }
};

exports.updateCoupon = async (req, res, next) => {
    try {
        const coupon = await couponService.updateCoupon(req.params.id, req.body);
        res.json({ success: true, message: 'Coupon updated successfully', data: coupon });
    } catch (error) {
        next(error);
    }
};

exports.deleteCoupon = async (req, res, next) => {
    try {
        const result = await couponService.deleteCoupon(req.params.id);
        res.json({ success: true, message: result.message });
    } catch (error) {
        next(error);
    }
};
