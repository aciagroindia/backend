const test = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateProductIdentifiers,
  mapProductToGoogle,
  SHIPPING_VERIFICATION_STATUS,
} = require('../src/services/merchantSync.service');
const {
  MERCHANT_CENTER_ID,
  DATA_SOURCE_ID,
  DATA_SOURCE_RESOURCE,
} = require('../src/config/googleMerchant');

test('Google Merchant API - Data Source Configuration Tests', async (t) => {
  await t.test('Correct Merchant Center ID and Data Source Resource', () => {
    assert.equal(MERCHANT_CENTER_ID, '5317000737');
    assert.equal(DATA_SOURCE_ID, '10769000507');
    assert.equal(DATA_SOURCE_RESOURCE, 'accounts/5317000737/dataSources/10769000507');
  });
});

test('Google Merchant API - Dynamic Identifier Mapping Tests', async (t) => {
  await t.test('Product without GTIN or MPN sets identifierExists to false', () => {
    const product = {
      name: 'Herbal Shampoo',
      price: 299,
      brand: 'ACI Agro Solutions',
    };
    const res = evaluateProductIdentifiers(product);
    assert.equal(res.identifierExists, false);
    assert.equal(res.hasGtin, false);
    assert.equal(res.hasMpn, false);
    assert.equal(res.brand, 'ACI Agro Solutions');
  });

  await t.test('Product with valid GTIN sets identifierExists to true', () => {
    const product = {
      name: 'Organic Neem Oil',
      price: 499,
      gtin: '8901234567890',
      brand: 'ACI Agro Solutions',
    };
    const res = evaluateProductIdentifiers(product);
    assert.equal(res.identifierExists, true);
    assert.equal(res.hasGtin, true);
    assert.equal(res.gtin, '8901234567890');
  });

  await t.test('Product with MPN/SKU and Brand sets identifierExists to true', () => {
    const product = {
      name: 'Bio Fertilizer 5kg',
      price: 850,
      sku: 'ACI-BIO-005',
      brand: 'ACI Agro Solutions',
    };
    const res = evaluateProductIdentifiers(product);
    assert.equal(res.identifierExists, true);
    assert.equal(res.hasMpn, true);
    assert.equal(res.mpn, 'ACI-BIO-005');
  });
});

test('Google Merchant API - Product Resource Mapping Tests (Merchant API v1 Schema)', async (t) => {
  await t.test('Formats price into amountMicros, maps productAttributes, and omits top-level channel', () => {
    const mockProduct = {
      _id: '69d65a4fdf82a64c06fb8bee',
      name: 'Noni Super Gold Juice',
      slug: 'noni-super-gold-juice',
      description: 'Pure natural noni juice',
      price: 699,
      stock: 10,
      status: 'Active',
      images: ['https://res.cloudinary.com/test/image.jpg'],
      category: { name: 'Health Juices' },
    };

    const mapped = mapProductToGoogle(mockProduct);

    assert.equal(mapped.offerId, '69d65a4fdf82a64c06fb8bee');
    assert.equal(mapped.contentLanguage, 'en');
    assert.equal(mapped.feedLabel, 'IN');
    assert.equal(mapped.channel, undefined, 'channel must not be present at top-level in ProductInput');

    const attr = mapped.productAttributes;
    assert.ok(attr, 'productAttributes must be present on ProductInput');
    assert.equal(attr.title, 'Noni Super Gold Juice');
    assert.equal(attr.link, 'https://aciagro.com/products/noni-super-gold-juice');
    assert.equal(attr.price.amountMicros, '699000000');
    assert.equal(attr.price.currencyCode, 'INR');
    assert.equal(attr.availability, 'IN_STOCK');
    assert.equal(attr.condition, 'NEW');
    assert.equal(attr.identifierExists, false);
    assert.equal(attr.gtins, undefined);

    // Shipping verification status check
    assert.equal(SHIPPING_VERIFICATION_STATUS, 'CODE_REVIEWED_UNVERIFIED_LIVE');
    assert.equal(attr.shipping[0].price.amountMicros, '0');
    assert.equal(attr.shipping[0].minHandlingTime, '1');
    assert.equal(attr.shipping[0].maxHandlingTime, '2');
    assert.equal(attr.shipping[0].minTransitTime, '2');
    assert.equal(attr.shipping[0].maxTransitTime, '6');
  });

  await t.test('Product with GTIN maps to gtins array and omits singular gtin', () => {
    const mockProductWithGtin = {
      _id: '69d65a4fdf82a64c06fb8bee',
      name: 'Noni Super Gold Juice',
      slug: 'noni-super-gold-juice',
      price: 699,
      gtin: '8901234567890',
      stock: 10,
      status: 'Active',
      images: ['https://res.cloudinary.com/test/image.jpg'],
    };

    const mapped = mapProductToGoogle(mockProductWithGtin);
    const attr = mapped.productAttributes;
    assert.deepEqual(attr.gtins, ['8901234567890']);
    assert.equal(attr.gtin, undefined, 'singular gtin must not be sent');
    assert.equal(attr.identifierExists, true);
  });

  await t.test('Out of stock or inactive product maps to OUT_OF_STOCK', () => {
    const mockProduct = {
      _id: '69d65a4fdf82a64c06fb8bff',
      name: 'Aloe Vera Gel',
      slug: 'aloe-vera-gel',
      price: 199,
      stock: 0,
      status: 'Active',
      images: ['https://res.cloudinary.com/test/image2.jpg'],
    };

    const mapped = mapProductToGoogle(mockProduct);
    assert.equal(mapped.productAttributes.availability, 'OUT_OF_STOCK');
  });
});
