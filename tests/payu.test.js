const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const {
  generatePaymentHash,
  verifyResponseHash,
  buildPaymentPayload,
  getPayUConfig,
} = require('../src/services/payuService');

// Set test environment variables
process.env.PAYU_MERCHANT_KEY = 'TEST_KEY_123';
process.env.PAYU_MERCHANT_SALT = 'TEST_SALT_456';
process.env.PAYU_ENV = 'test';
process.env.BASE_URL = 'http://localhost:5000';
process.env.FRONTEND_URL = 'http://localhost:3000';

test('PayU Config should resolve correctly', () => {
  const config = getPayUConfig();
  assert.equal(config.merchantKey, 'TEST_KEY_123');
  assert.equal(config.merchantSalt, 'TEST_SALT_456');
  assert.equal(config.environment, 'test');
  assert.equal(config.paymentUrl, 'https://test.payu.in/_payment');
});

test('PayU Payment Hash generation matches SHA-512 standard', () => {
  const txnid = 'TXN_TEST_001';
  const amount = 599.00;
  const productinfo = 'Order_12345';
  const firstname = 'Rahul';
  const email = 'rahul@example.com';
  const udf1 = 'order_id_mongodb_123';

  const { hash, formattedAmount } = generatePaymentHash({
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
  });

  // Expected formula: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
  const expectedHashString = `TEST_KEY_123|${txnid}|${formattedAmount}|${productinfo}|${firstname}|${email}|${udf1}||||||||||TEST_SALT_456`;
  const expectedHash = crypto.createHash('sha512').update(expectedHashString).digest('hex');

  assert.equal(hash, expectedHash);
  assert.equal(formattedAmount, '599.00');
});

test('PayU Reverse Response Hash verification succeeds with valid payload', () => {
  const status = 'success';
  const txnid = 'TXN_TEST_001';
  const amount = '599.00';
  const productinfo = 'Order_12345';
  const firstname = 'Rahul';
  const email = 'rahul@example.com';
  const udf1 = 'order_id_mongodb_123';

  // Reverse Hash formula: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
  const reverseString = `TEST_SALT_456|${status}||||||||||${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|TEST_KEY_123`;
  const validHash = crypto.createHash('sha512').update(reverseString).digest('hex');

  const responsePayload = {
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
    hash: validHash,
    key: 'TEST_KEY_123',
  };

  const isValid = verifyResponseHash(responsePayload);
  assert.equal(isValid, true);
});

test('PayU Reverse Response Hash verification succeeds with additionalCharges', () => {
  const status = 'success';
  const txnid = 'TXN_TEST_002';
  const amount = '599.00';
  const productinfo = 'Order_12345';
  const firstname = 'Rahul';
  const email = 'rahul@example.com';
  const udf1 = 'order_id_mongodb_123';
  const additionalCharges = '10.00';

  // Reverse Hash with additionalCharges:
  // sha512(additionalCharges|SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
  const reverseString = `${additionalCharges}|TEST_SALT_456|${status}||||||||||${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|TEST_KEY_123`;
  const validHash = crypto.createHash('sha512').update(reverseString).digest('hex');

  const responsePayload = {
    status,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
    additionalCharges,
    hash: validHash,
    key: 'TEST_KEY_123',
  };

  const isValid = verifyResponseHash(responsePayload);
  assert.equal(isValid, true);
});

test('PayU Reverse Response Hash verification rejects tampered hash or tampered amount', () => {
  const responsePayload = {
    status: 'success',
    txnid: 'TXN_TEST_001',
    amount: '1.00', // Tampered amount
    productinfo: 'Order_12345',
    firstname: 'Rahul',
    email: 'rahul@example.com',
    udf1: 'order_id_mongodb_123',
    hash: 'fake_tampered_hash_value',
    key: 'TEST_KEY_123',
  };

  const isValid = verifyResponseHash(responsePayload);
  assert.equal(isValid, false);
});

test('buildPaymentPayload returns correct Hosted Checkout form parameters', () => {
  const fakeOrder = {
    _id: '66554433221100aabbccddee',
    totalAmount: 1299,
    shippingInfo: {
      name: 'John Doe',
      phone: '9876543210',
    },
  };

  const fakeUser = {
    _id: '554433221100aabbccddee11',
    name: 'John Doe',
    email: 'john@example.com',
  };

  const payload = buildPaymentPayload({ order: fakeOrder, user: fakeUser, isBuyNow: true });

  assert.equal(payload.actionUrl, 'https://test.payu.in/_payment');
  assert.equal(payload.params.key, 'TEST_KEY_123');
  assert.equal(payload.params.amount, '1299.00');
  assert.equal(payload.params.firstname, 'John');
  assert.equal(payload.params.email, 'john@example.com');
  assert.equal(payload.params.phone, '9876543210');
  assert.equal(payload.params.udf1, '66554433221100aabbccddee');
  assert.equal(payload.params.udf3, 'true');
  assert.equal(payload.params.surl, 'http://localhost:5000/api/orders/payu-response');
  assert.equal(payload.params.furl, 'http://localhost:5000/api/orders/payu-response');
  assert.ok(payload.params.hash.length === 128); // SHA-512 hex length is 128
});

test('buildPaymentPayload sanitizes special characters in names and phones', () => {
  const fakeOrder = {
    _id: '66554433221100aabbccddee',
    totalAmount: 49.5,
    shippingInfo: {
      name: 'Amit & Sons <Ltd>',
      phone: '+91-98765-43210',
    },
  };

  const fakeUser = {
    _id: '554433221100aabbccddee11',
    name: 'Amit',
    email: 'amit@example.com',
  };

  const payload = buildPaymentPayload({ order: fakeOrder, user: fakeUser, isBuyNow: false });

  assert.equal(payload.params.firstname, 'Amit');
  assert.equal(payload.params.phone, '9876543210');
  assert.equal(payload.params.amount, '49.50');
  assert.equal(payload.params.udf3, 'false');
});
