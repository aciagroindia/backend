const Product = require('../models/Product');
const Category = require('../models/Category');

const resolveItemPrice = (product, item) => {
  let itemPrice = Number(item.price);
  if (product.packages && product.packages.length > 0) {
    const itemVariant = (item.variant || "").trim();
    const matchedPkg = product.packages.find(p => 
      (item.packageId && p._id.toString() === item.packageId.toString()) ||
      (itemVariant && p.name.trim().toLowerCase() === itemVariant.toLowerCase()) ||
      (item.price && Number(p.price) === Number(item.price))
    );
    if (matchedPkg) {
      itemPrice = Number(matchedPkg.price);
    } else if (isNaN(itemPrice) || itemPrice <= 0) {
      itemPrice = Number(product.packages[0].price);
    }
  } else if (isNaN(itemPrice) || itemPrice <= 0) {
    itemPrice = Number(product.price);
  }
  return itemPrice;
};

/**
 * Calculates Combo Discounts for a set of items based on Category Combo Rules.
 * @param {Array} items - Array of { productId, product, price, quantity, variant, packageId }
 * @returns {Promise<Object>} { originalSubtotal, comboDiscount, comboSubtotal, appliedCombos }
 */
const calculateComboDiscounts = async (items = []) => {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      return {
        originalSubtotal: 0,
        comboDiscount: 0,
        comboSubtotal: 0,
        appliedCombos: [],
      };
    }

    // 1. Fetch DB products and populate category details
    const productIds = items.map(item => (item.productId || item.product || item._id || '').toString()).filter(Boolean);
    const productsFromDB = await Product.find({ _id: { $in: productIds } }).populate('category').populate('categories');
    const productMap = new Map(productsFromDB.map(p => [p._id.toString(), p]));

    let originalSubtotal = 0;
    // Map of categoryId -> { category, units: Array<{ price, name, productId }> }
    const categoryGroups = new Map();

    for (const item of items) {
      const pId = (item.productId || item.product || item._id || '').toString();
      const product = productMap.get(pId);
      if (!product) continue;

      const qty = Number(item.quantity || item.qty || 1);
      if (qty <= 0) continue;

      const itemPrice = resolveItemPrice(product, item);
      originalSubtotal += itemPrice * qty;

      const eligibleCategories = [];
      if (product.category && product.category.status === 'Active' && Array.isArray(product.category.comboRules) && product.category.comboRules.length > 0) {
        eligibleCategories.push(product.category);
      }
      if (Array.isArray(product.categories)) {
        for (const cat of product.categories) {
          if (cat && cat.status === 'Active' && Array.isArray(cat.comboRules) && cat.comboRules.length > 0) {
            if (!eligibleCategories.some(ec => ec._id.toString() === cat._id.toString())) {
              eligibleCategories.push(cat);
            }
          }
        }
      }

      for (const category of eligibleCategories) {
        const catId = category._id.toString();
        if (!categoryGroups.has(catId)) {
          categoryGroups.set(catId, {
            category,
            units: [],
          });
        }
        for (let i = 0; i < qty; i++) {
          categoryGroups.get(catId).units.push({
            price: itemPrice,
            name: product.name,
            productId: product._id,
          });
        }
      }
    }

    let totalComboDiscount = 0;
    const appliedCombos = [];

    // 2. Evaluate Combo Rules for each Category group
    for (const [catId, group] of categoryGroups.entries()) {
      const { category, units } = group;
      // Sort units descending by price for optimal bundle savings
      units.sort((a, b) => b.price - a.price);

      // Sort rules descending by required quantity (e.g., 3-pack rule before 2-pack rule)
      const sortedRules = [...category.comboRules].sort((a, b) => b.quantity - a.quantity);
      
      let remainingUnits = [...units];

      for (const rule of sortedRules) {
        const requiredQty = Number(rule.quantity);
        const fixedPrice = Number(rule.fixedPrice);

        if (isNaN(requiredQty) || requiredQty < 2 || isNaN(fixedPrice) || fixedPrice <= 0) {
          continue;
        }

        while (remainingUnits.length >= requiredQty) {
          // Take the first requiredQty units
          const comboUnits = remainingUnits.slice(0, requiredQty);
          const normalTotal = comboUnits.reduce((sum, u) => sum + u.price, 0);

          // Only apply if user actually saves money
          if (normalTotal > fixedPrice) {
            const savings = Math.round((normalTotal - fixedPrice) * 100) / 100;
            totalComboDiscount += savings;
            appliedCombos.push({
              categoryId: category._id,
              categoryName: category.name,
              quantity: requiredQty,
              fixedPrice: fixedPrice,
              normalPrice: normalTotal,
              savings: savings,
            });
            // Remove consumed units
            remainingUnits = remainingUnits.slice(requiredQty);
          } else {
            // If normal total is already less than or equal to combo price, don't apply this tier
            break;
          }
        }
      }
    }

    totalComboDiscount = Math.round(totalComboDiscount * 100) / 100;
    const comboSubtotal = Math.max(0, Math.round((originalSubtotal - totalComboDiscount) * 100) / 100);

    return {
      originalSubtotal,
      comboDiscount: totalComboDiscount,
      comboSubtotal,
      appliedCombos,
    };
  } catch (error) {
    console.error('Combo pricing calculation error:', error);
    const fallbackSubtotal = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity || i.qty) || 1), 0);
    return {
      originalSubtotal: fallbackSubtotal,
      comboDiscount: 0,
      comboSubtotal: fallbackSubtotal,
      appliedCombos: [],
    };
  }
};

module.exports = {
  calculateComboDiscounts,
};
