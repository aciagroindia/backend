const Coupon = require('../models/Coupon');
const couponService = require('../services/coupon.service');
const Product = require('../models/Product');

exports.getAvailableCoupons = async (req, res, next) => {
    try {
        const userId = req.user ? req.user.id : null;
        const coupons = await Coupon.find({ isActive: true }).sort({ createdAt: -1 });
        const now = new Date();

        const available = coupons.filter(coupon => {
            // 1. Check expiry
            if (coupon.expiryDate) {
                const exp = new Date(coupon.expiryDate);
                exp.setHours(23, 59, 59, 999);
                if (exp < now) return false;
            }
            // 2. Check global limit
            if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
                return false;
            }
            // 3. Check per-user limit
            if (userId && coupon.usedBy && coupon.usedBy.length > 0) {
                const record = coupon.usedBy.find(u => u.user && u.user.toString() === userId.toString());
                if (record && record.count >= (coupon.userUsageLimit || 1)) {
                    return false;
                }
            }
            return true;
        }).map(c => ({
            id: c._id,
            code: c.code,
            discountType: c.discountType,
            discountValue: c.discountValue,
            minOrderAmount: c.minOrderAmount || 0,
            maxDiscountAmount: c.maxDiscountAmount || null,
            expiryDate: c.expiryDate,
        }));

        res.json({ success: true, data: available });
    } catch (error) {
        next(error);
    }
};

exports.applyCoupon = async (req, res, next) => {
    try {
        const { code, items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart items are required to apply coupon' });
        }

        // Calculate accurate server subtotal
        const productIds = items.map(item => item.productId || item.product || item._id);
        const productsFromDB = await Product.find({ _id: { $in: productIds } });
        const productMap = new Map(productsFromDB.map(p => [p._id.toString(), p]));

        let subtotal = 0;
        for (const item of items) {
            const pId = (item.productId || item.product || item._id || '').toString();
            const product = productMap.get(pId);
            if (product) {
                const qty = item.quantity || item.qty || 1;
                subtotal += product.price * qty;
            }
        }

        const result = await couponService.validateAndApplyCoupon(code, req.user ? req.user.id : null, subtotal);

        res.json({
            success: true,
            message: `Coupon '${result.code}' applied successfully! You saved Rs. ${result.discountAmount}`,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

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
