const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('Coupon Code Calculation and Validation Tests', () => {
  test('Percentage coupon calculation without cap', () => {
    const subtotal = 1200;
    const coupon = { discountType: 'Percentage', discountValue: 10 };
    const discount = (subtotal * coupon.discountValue) / 100;
    assert.equal(discount, 120);
    assert.equal(subtotal - discount, 1080);
  });

  test('Percentage coupon calculation with maximum discount cap', () => {
    const subtotal = 3000;
    const coupon = { discountType: 'Percentage', discountValue: 20, maxDiscountAmount: 250 };
    let discount = (subtotal * coupon.discountValue) / 100; // 600
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }
    assert.equal(discount, 250);
    assert.equal(subtotal - discount, 2750);
  });

  test('Fixed Amount coupon calculation', () => {
    const subtotal = 900;
    const coupon = { discountType: 'FixedAmount', discountValue: 200 };
    const discount = Math.min(coupon.discountValue, subtotal);
    assert.equal(discount, 200);
    assert.equal(subtotal - discount, 700);
  });

  test('Minimum order subtotal threshold enforcement', () => {
    const coupon = { minOrderAmount: 500, discountType: 'FixedAmount', discountValue: 50 };

    const subtotalLow = 450;
    assert.equal(subtotalLow >= coupon.minOrderAmount, false);

    const subtotalHigh = 550;
    assert.equal(subtotalHigh >= coupon.minOrderAmount, true);
  });

  test('Expiry date validation', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const isExpired = (expiryDate) => {
      if (!expiryDate) return false;
      const expiry = new Date(expiryDate);
      expiry.setHours(23, 59, 59, 999);
      return expiry < new Date();
    };

    assert.equal(isExpired(pastDate), true);
    assert.equal(isExpired(futureDate), false);
  });

  test('Global and per-user usage limits validation', () => {
    const coupon = {
      usageLimit: 100,
      usageCount: 100,
      userUsageLimit: 1,
      usedBy: [{ user: 'user123', count: 1 }],
    };

    // Global limit reached
    assert.equal(coupon.usageCount >= coupon.usageLimit, true);

    // Per user limit reached
    const userRecord = coupon.usedBy.find(u => u.user === 'user123');
    assert.equal(userRecord.count >= coupon.userUsageLimit, true);

    // Other user not yet used
    const otherUserRecord = coupon.usedBy.find(u => u.user === 'user999');
    assert.equal(!otherUserRecord, true);
  });
});
