const Discount = require('../models/Discount');
const Order = require('../models/Order');

/**
 * Automatically calculates the best applicable discount for a user's cart
 * @param {string} userId - ID of the authenticated user
 * @param {Array} items - Array of { productId, price, quantity }
 * @param {number} subtotal - Calculated subtotal of all items
 */
const calculateBestAutomaticDiscount = async (userId, items = [], subtotal = 0) => {
  try {
    if (!subtotal || subtotal <= 0) {
      return {
        subtotal: 0,
        discountAmount: 0,
        finalTotal: 0,
        appliedDiscount: null,
      };
    }

    // 1. Fetch all active automatic discounts
    const activeDiscounts = await Discount.find({ isActive: true });

    if (!activeDiscounts || activeDiscounts.length === 0) {
      return {
        subtotal,
        discountAmount: 0,
        finalTotal: subtotal,
        appliedDiscount: null,
      };
    }

    // 2. Check user's order history to evaluate FIRST_ORDER conditions
    let userOrderCount = 0;
    if (userId) {
      userOrderCount = await Order.countDocuments({
        customer: userId,
        orderStatus: { $ne: 'cancelled' },
        paymentStatus: { $in: ['paid', 'pending'] },
      });
    }

    let bestDiscount = null;
    let maxSavings = 0;

    // 3. Evaluate each active discount
    for (const discount of activeDiscounts) {
      // Condition A: First Order Discount
      if (discount.conditionType === 'FIRST_ORDER') {
        if (userOrderCount > 0) {
          continue; // User already has placed an order
        }
      }

      // Condition B: Minimum Order Value
      if (discount.minOrderAmount && discount.minOrderAmount > 0) {
        if (subtotal < discount.minOrderAmount) {
          continue; // Minimum subtotal threshold not met
        }
      }

      // Condition C: Specific Products
      if (discount.conditionType === 'SPECIFIC_PRODUCTS' && discount.products && discount.products.length > 0) {
        const allowedProductIds = new Set(discount.products.map(p => p.toString()));
        const matchingItems = items.filter(item => {
          const pId = (item.productId || item.product || item._id || '').toString();
          return allowedProductIds.has(pId);
        });

        if (matchingItems.length === 0) {
          continue; // No matching products in cart
        }
      }

      // 4. Calculate savings
      let savings = 0;

      if (discount.type === 'Percentage') {
        savings = (subtotal * discount.value) / 100;
        if (discount.maxDiscountAmount && discount.maxDiscountAmount > 0 && savings > discount.maxDiscountAmount) {
          savings = discount.maxDiscountAmount;
        }
      } else if (discount.type === 'Fixed Amount') {
        savings = Math.min(discount.value, subtotal);
      } else if (discount.type === 'Shipping') {
        savings = 0; // Free shipping benefit
      } else if (discount.type === 'BOGO') {
        savings = 0;
      }

      // Keep candidate with the highest savings
      if (savings > maxSavings) {
        maxSavings = savings;
        bestDiscount = discount;
      }
    }

    // Round savings to 2 decimals
    const roundedDiscountAmount = Math.round(maxSavings * 100) / 100;
    const finalTotal = Math.max(0, Math.round((subtotal - roundedDiscountAmount) * 100) / 100);

    return {
      subtotal,
      discountAmount: roundedDiscountAmount,
      finalTotal,
      appliedDiscount: bestDiscount ? {
        discountId: bestDiscount._id,
        name: bestDiscount.name,
        type: bestDiscount.type,
        value: bestDiscount.value,
        conditionType: bestDiscount.conditionType,
      } : null,
    };
  } catch (error) {
    console.error('Discount calculation error:', error.message);
    return {
      subtotal,
      discountAmount: 0,
      finalTotal: subtotal,
      appliedDiscount: null,
    };
  }
};

module.exports = {
  calculateBestAutomaticDiscount,
};
