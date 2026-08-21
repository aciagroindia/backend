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
    const cleanCode = data.code.trim().toUpperCase();
    const exists = await Coupon.findOne({ code: cleanCode });
    if (exists) throw createError(400, 'Coupon code already exists');
    return await Coupon.create({
        ...data,
        code: cleanCode,
    });
};

exports.updateCoupon = async (id, data) => {
    if (data.code) {
        data.code = data.code.trim().toUpperCase();
    }
    const coupon = await Coupon.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!coupon) throw createError(404, 'Coupon not found');
    return coupon;
};

exports.deleteCoupon = async (id) => {
    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) throw createError(404, 'Coupon not found');
    return { message: 'Coupon deleted successfully' };
};

/**
 * Validate and calculate discount for a coupon code
 */
exports.validateAndApplyCoupon = async (code, userId, subtotal = 0) => {
    if (!code || !code.trim()) {
        throw createError(400, 'Coupon code is required');
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: cleanCode });

    if (!coupon || !coupon.isActive) {
        throw createError(400, 'Invalid or inactive coupon code');
    }

    // 1. Expiry Check
    if (coupon.expiryDate) {
        const expiry = new Date(coupon.expiryDate);
        expiry.setHours(23, 59, 59, 999);
        if (expiry < new Date()) {
            throw createError(400, 'This coupon code has expired');
        }
    }

    // 2. Global Usage Limit Check
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        throw createError(400, 'This coupon has reached its maximum global usage limit');
    }

    // 3. Per-User Usage Limit Check
    if (userId && coupon.usedBy && coupon.usedBy.length > 0) {
        const userRecord = coupon.usedBy.find(u => u.user && u.user.toString() === userId.toString());
        const userLimit = coupon.userUsageLimit || 1;
        if (userRecord && userRecord.count >= userLimit) {
            throw createError(400, `You have already used this coupon maximum allowed times (${userLimit} time${userLimit > 1 ? 's' : ''})`);
        }
    }

    // 4. Minimum Order Amount Check
    if (coupon.minOrderAmount && coupon.minOrderAmount > 0) {
        if (subtotal < coupon.minOrderAmount) {
            throw createError(400, `Minimum order amount of Rs. ${coupon.minOrderAmount} required to apply this coupon`);
        }
    }

    // 5. Calculate Savings
    let discountAmount = 0;
    if (coupon.discountType === 'Percentage') {
        discountAmount = (subtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0 && discountAmount > coupon.maxDiscountAmount) {
            discountAmount = coupon.maxDiscountAmount;
        }
    } else {
        discountAmount = Math.min(coupon.discountValue, subtotal);
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    const finalTotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    return {
        couponId: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        subtotal,
        finalTotal,
    };
};

/**
 * Record coupon usage after successful payment or COD order
 */
exports.recordCouponUsage = async (couponId, userId) => {
    try {
        if (!couponId) return;

        const coupon = await Coupon.findById(couponId);
        if (!coupon) return;

        coupon.usageCount = (coupon.usageCount || 0) + 1;

        if (userId) {
            const userIndex = coupon.usedBy.findIndex(u => u.user && u.user.toString() === userId.toString());
            if (userIndex >= 0) {
                coupon.usedBy[userIndex].count += 1;
            } else {
                coupon.usedBy.push({ user: userId, count: 1 });
            }
        }

        await coupon.save();
    } catch (err) {
        console.error('Failed to record coupon usage:', err.message);
    }
};
