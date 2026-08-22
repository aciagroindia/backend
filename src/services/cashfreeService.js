const crypto = require('crypto');

/**
 * Cashfree Payment Gateway Service
 * Implements Cashfree PG REST API v3 (2023-08-01)
 */

const getCashfreeConfig = () => {
  const rawAppId = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID || '';
  const rawSecretKey = process.env.CASHFREE_SECRET_KEY || process.env.CASHFREE_CLIENT_SECRET || '';
  const rawEnv = (process.env.CASHFREE_ENV || '').trim().toUpperCase();

  const appId = rawAppId.replace(/^["']|["']$/g, '').trim();
  const secretKey = rawSecretKey.replace(/^["']|["']$/g, '').trim();
  const apiVersion = (process.env.CASHFREE_API_VERSION || '2023-08-01').trim();

  // Smart environment resolution:
  // 1. If CASHFREE_ENV is explicitly set to PRODUCTION/LIVE or TEST/SANDBOX, respect it.
  // 2. Otherwise, if App ID starts with 'TEST' -> SANDBOX.
  // 3. Otherwise, if NODE_ENV is production -> PRODUCTION, else SANDBOX.
  let isProd = false;
  if (rawEnv === 'PRODUCTION' || rawEnv === 'LIVE') {
    isProd = true;
  } else if (rawEnv === 'TEST' || rawEnv === 'SANDBOX') {
    isProd = false;
  } else if (appId.startsWith('TEST') || appId.toLowerCase().includes('test')) {
    isProd = false;
  } else if (process.env.NODE_ENV === 'production') {
    isProd = true;
  } else {
    isProd = false;
  }

  const baseUrl = isProd
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

  let frontendUrl = (process.env.FRONTEND_URL || '').trim();
  let backendBaseUrl = (process.env.BASE_URL || '').trim();

  // In Production mode, Cashfree strictly enforces valid HTTPS URLs
  if (isProd) {
    if (!frontendUrl || frontendUrl.includes('localhost') || !frontendUrl.startsWith('https://')) {
      frontendUrl = 'https://aciagro.com';
    }
    if (!backendBaseUrl || backendBaseUrl.includes('localhost') || !backendBaseUrl.startsWith('https://')) {
      backendBaseUrl = 'https://api.aciagro.com';
    }
  } else {
    if (!frontendUrl) frontendUrl = 'http://localhost:3000';
    if (!backendBaseUrl) backendBaseUrl = 'http://localhost:5000';
  }

  if (!appId || !secretKey) {
    console.warn('⚠️ [Cashfree Config Warning] CASHFREE_APP_ID or CASHFREE_SECRET_KEY is missing in .env!');
  }

  return {
    appId,
    secretKey,
    apiVersion,
    environment: isProd ? 'PRODUCTION' : 'SANDBOX',
    baseUrl,
    frontendUrl,
    backendBaseUrl,
  };
};

/**
 * Create a Cashfree Order & Generate payment_session_id
 */
const createCashfreeOrder = async ({ order, user, isBuyNow = false }) => {
  const config = getCashfreeConfig();

  // Cashfree order_id must be alphanumeric, underscore, hyphen, max 50 chars
  // We format it with order ID and timestamp for retry idempotency
  const cfOrderId = `order_${order._id.toString()}_${Date.now()}`;
  const amount = Number(order.totalAmount);

  // Clean customer details
  const customerName = (order.shippingInfo?.name || user?.name || 'Customer').trim();
  const customerEmail = (user?.email || 'customer@aciagro.com').trim();
  const rawPhone = (order.shippingInfo?.phone || order.shippingInfo?.phoneNo || user?.phone || '9999999999').replace(/[^0-9]/g, '');
  const customerPhone = rawPhone.slice(-10) || '9999999999';
  const customerId = (user?._id || user?.id || order.customer || 'cust_' + Date.now()).toString();

  const returnUrl = `${config.frontendUrl.replace(/\/$/, '')}/orders?order_id={order_id}&order_status={order_status}`;

  const orderMeta = {
    return_url: returnUrl,
  };

  // Only pass notify_url if it's a valid HTTPS URL (or sandbox HTTP)
  if (config.backendBaseUrl && (config.backendBaseUrl.startsWith('https://') || !config.environment.includes('PROD'))) {
    orderMeta.notify_url = `${config.backendBaseUrl.replace(/\/$/, '')}/api/orders/cashfree-webhook`;
  }

  const payload = {
    order_id: cfOrderId,
    order_amount: Math.max(1, amount),
    order_currency: 'INR',
    customer_details: {
      customer_id: customerId,
      customer_name: customerName || 'Customer',
      customer_email: customerEmail,
      customer_phone: customerPhone,
    },
    order_meta: orderMeta,
    order_note: `ACI Agro Order #${order._id.toString().slice(-6)}`,
    order_tags: {
      mongo_order_id: order._id.toString(),
      is_buy_now: isBuyNow ? 'true' : 'false',
    },
  };

  try {
    const response = await fetch(`${config.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': config.appId,
        'x-client-secret': config.secretKey,
        'x-api-version': config.apiVersion,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Cashfree Create Order Error]:', data);
      throw new Error(data.message || 'Failed to create Cashfree order');
    }

    return {
      success: true,
      cf_order_id: data.cf_order_id,
      order_id: data.order_id,
      payment_session_id: data.payment_session_id,
      order_status: data.order_status,
      environment: config.environment,
    };
  } catch (error) {
    console.error('[Cashfree Service Exception]:', error.message);
    throw error;
  }
};

/**
 * Verify Order status directly from Cashfree Server-to-Server API
 */
const verifyCashfreePayment = async (orderId) => {
  const config = getCashfreeConfig();

  try {
    const response = await fetch(`${config.baseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': config.appId,
        'x-client-secret': config.secretKey,
        'x-api-version': config.apiVersion,
      },
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Cashfree Verify Order Error]:', data);
      return {
        success: false,
        message: data.message || 'Failed to fetch Cashfree order status',
        data,
      };
    }

    return {
      success: true,
      data,
      isPaid: data.order_status === 'PAID',
      orderStatus: data.order_status,
      orderAmount: data.order_amount,
      cfOrderId: data.cf_order_id,
      orderId: data.order_id,
      orderTags: data.order_tags,
    };
  } catch (error) {
    console.error('[Cashfree Verify S2S Exception]:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Verify Cashfree Webhook Signature
 * Formula: HMAC SHA256 of (timestamp + rawBody) using secretKey
 */
const verifyWebhookSignature = (signature, rawBody, timestamp) => {
  const { secretKey } = getCashfreeConfig();
  if (!signature || !rawBody || !timestamp) return false;

  try {
    const bodyString = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
    const signatureData = `${timestamp}${bodyString}`;
    const generatedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(signatureData)
      .digest('base64');

    return generatedSignature === signature;
  } catch (err) {
    console.error('[Cashfree Webhook Signature Verification Error]:', err.message);
    return false;
  }
};

module.exports = {
  getCashfreeConfig,
  createCashfreeOrder,
  verifyCashfreePayment,
  verifyWebhookSignature,
};
