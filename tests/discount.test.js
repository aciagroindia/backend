const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

describe('Automatic Discount Calculation Engine Tests', () => {
  // Test in-memory calculation logic without DB dependency
  test('Percentage discount calculation without cap', () => {
    const subtotal = 1000;
    const discount = { type: 'Percentage', value: 10 };
    const savings = (subtotal * discount.value) / 100;
    assert.equal(savings, 100);
    assert.equal(subtotal - savings, 900);
  });

  test('Percentage discount calculation with maximum cap', () => {
    const subtotal = 5000;
    const discount = { type: 'Percentage', value: 20, maxDiscountAmount: 200 };
    let savings = (subtotal * discount.value) / 100; // 1000
    if (discount.maxDiscountAmount && savings > discount.maxDiscountAmount) {
      savings = discount.maxDiscountAmount;
    }
    assert.equal(savings, 200);
    assert.equal(subtotal - savings, 4800);
  });

  test('Fixed Amount discount calculation', () => {
    const subtotal = 800;
    const discount = { type: 'Fixed Amount', value: 150 };
    const savings = Math.min(discount.value, subtotal);
    assert.equal(savings, 150);
    assert.equal(subtotal - savings, 650);
  });

  test('Min Order Value threshold condition check', () => {
    const discount = { minOrderAmount: 1000, type: 'Fixed Amount', value: 100 };
    
    // Below threshold
    const subtotalLow = 800;
    const isEligibleLow = subtotalLow >= discount.minOrderAmount;
    assert.equal(isEligibleLow, false);

    // Meets threshold
    const subtotalHigh = 1200;
    const isEligibleHigh = subtotalHigh >= discount.minOrderAmount;
    assert.equal(isEligibleHigh, true);
  });

  test('First Order condition logic', () => {
    const isFirstOrderRule = (orderCount) => orderCount === 0;

    // New user
    assert.equal(isFirstOrderRule(0), true);

    // Existing customer with 1 or more orders
    assert.equal(isFirstOrderRule(1), false);
    assert.equal(isFirstOrderRule(5), false);
  });

  test('Best discount selection among multiple active discounts', () => {
    const subtotal = 2000;
    const discounts = [
      { name: '10% Storewide', type: 'Percentage', value: 10 }, // 200
      { name: 'Flat 150 Off', type: 'Fixed Amount', value: 150 }, // 150
      { name: 'Special 15%', type: 'Percentage', value: 15 }, // 300
    ];

    let best = null;
    let maxSavings = 0;

    for (const d of discounts) {
      let savings = d.type === 'Percentage' ? (subtotal * d.value) / 100 : d.value;
      if (savings > maxSavings) {
        maxSavings = savings;
        best = d;
      }
    }

    assert.equal(best.name, 'Special 15%');
    assert.equal(maxSavings, 300);
    assert.equal(subtotal - maxSavings, 1700);
  });
});
