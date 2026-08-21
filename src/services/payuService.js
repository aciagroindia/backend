const crypto = require('crypto');

/**
 * PayU Payment Gateway Service
 * Implements official PayU Hosted Checkout & Web Services API specifications
 */

const getPayUConfig = () => {
  const merchantKey = process.env.PAYU_MERCHANT_KEY || process.env.PAYU_KEY || 'dummy_key';
  const merchantSalt = process.env.PAYU_MERCHANT_SALT || process.env.PAYU_SALT || 'dummy_salt';
  const environment = (process.env.PAYU_ENV || process.env.NODE_ENV || 'test').toLowerCase();
  
  const isProd = environment === 'production' || environment === 'live';
  
  const paymentUrl = isProd
    ? 'https://secure.payu.in/_payment'
    : 'https://test.payu.in/_payment';

  const boltScriptUrl = isProd
    ? 'https://jssdk.payu.in/bolt/bolt.min.js'
    : 'https://jssdk-uat.payu.in/bolt/bolt.min.js';

  const webServiceUrl = isProd
    ? 'https://info.payu.in/merchant/postservice.php?form=2'
    : 'https://test.payu.in/merchant/postservice.php?form=2';

  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  return {
    merchantKey,
    merchantSalt,
    environment: isProd ? 'production' : 'test',
    paymentUrl,
    boltScriptUrl,
    webServiceUrl,
    baseUrl,
    frontendUrl,
  };
};

/**
 * Generate SHA-512 hash for initiating payment request
 * Hash Sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
 */
const generatePaymentHash = ({ txnid, amount, productinfo, firstname, email, udf1 = '', udf2 = '', udf3 = '', udf4 = '', udf5 = '' }) => {
  const { merchantKey, merchantSalt } = getPayUConfig();
  
  // Format amount to 2 decimal places if needed or clean string
  const formattedAmount = typeof amount === 'number' ? amount.toFixed(2) : String(amount);
  
  const hashString = `${merchantKey}|${txnid}|${formattedAmount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${merchantSalt}`;
  
  const hash = crypto.createHash('sha512').update(hashString).digest('hex');
  return { hash, formattedAmount, merchantKey };
};

/**
 * Verify SHA-512 Reverse Response Hash sent by PayU
 * If additionalCharges is present:
 * sha512(additionalCharges|SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 * Else:
 * sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 */
const verifyResponseHash = (responseBody) => {
  const { merchantKey, merchantSalt } = getPayUConfig();
  
  const {
    hash: receivedHash,
    status,
    email = '',
    firstname = '',
    productinfo = '',
    amount = '',
    txnid = '',
    key = merchantKey,
    udf1 = '',
    udf2 = '',
    udf3 = '',
    udf4 = '',
    udf5 = '',
    additionalCharges,
  } = responseBody;

  if (!receivedHash) {
    return false;
  }

  let hashString = '';
  if (additionalCharges && additionalCharges.toString().trim() !== '') {
    hashString = `${additionalCharges}|${merchantSalt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  } else {
    hashString = `${merchantSalt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  }

  const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');
  return calculatedHash.toLowerCase() === receivedHash.toLowerCase();
};

/**
 * Server-to-server transaction verification via PayU verify_payment web service
 * Hash Formula: sha512(key|command|var1|salt)
 */
const verifyPaymentServerToServer = async (txnid) => {
  try {
    const { merchantKey, merchantSalt, webServiceUrl } = getPayUConfig();
    
    // Command is verify_payment, var1 is txnid
    const command = 'verify_payment';
    const hashString = `${merchantKey}|${command}|${txnid}|${merchantSalt}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const params = new URLSearchParams();
    params.append('key', merchantKey);
    params.append('command', command);
    params.append('var1', txnid);
    params.append('hash', hash);

    const response = await fetch(webServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(10000),
    });

    const responseData = await response.json();

    if (responseData && responseData.status === 1) {
      const transactionDetails = responseData.transaction_details?.[txnid];
      return {
        success: true,
        data: transactionDetails,
        fullResponse: responseData,
      };
    }

    return {
      success: false,
      message: responseData?.msg || 'Transaction not found or verification failed',
      fullResponse: responseData,
    };
  } catch (error) {
    console.error('PayU verify_payment API error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Build PayU Payment Request Payload for form submission
 */
const buildPaymentPayload = ({ order, user, isBuyNow = false }) => {
  const { merchantKey, paymentUrl, boltScriptUrl, baseUrl } = getPayUConfig();
  
  // Format clean transaction ID: txnid must be alphanumeric and unique
  const txnid = `TXN_${order._id.toString()}_${Date.now()}`;
  
  // Clean productinfo: alphanumeric with spaces/hyphens
  const productinfo = `Order_${order._id.toString()}`;
  
  // Clean user names
  const rawName = (order.shippingInfo?.name || user?.name || 'Customer').trim();
  const firstname = rawName.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '') || 'Customer';
  const email = (user?.email || 'customer@aciagro.com').trim();
  const phone = (order.shippingInfo?.phone || order.shippingInfo?.phoneNo || user?.phone || '9999999999').replace(/[^0-9]/g, '').slice(-10) || '9999999999';

  const amount = Number(order.totalAmount);
  const udf1 = order._id.toString(); // Mongo Order ID
  const udf2 = (user?._id || user?.id || '').toString();
  const udf3 = isBuyNow ? 'true' : 'false';
  const udf4 = '';
  const udf5 = '';

  const { hash, formattedAmount } = generatePaymentHash({
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5,
  });

  const surl = `${baseUrl}/api/orders/payu-response`;
  const furl = `${baseUrl}/api/orders/payu-response`;

  return {
    actionUrl: paymentUrl,
    boltScriptUrl,
    params: {
      key: merchantKey,
      txnid,
      amount: formattedAmount,
      productinfo,
      firstname,
      email,
      phone,
      surl,
      furl,
      hash,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
    },
    txnid,
  };
};

module.exports = {
  getPayUConfig,
  generatePaymentHash,
  verifyResponseHash,
  verifyPaymentServerToServer,
  buildPaymentPayload,
};
