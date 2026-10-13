const Product = require('../models/Product');
require('../models/Category');
const MerchantSyncLog = require('../models/MerchantSyncLog');
const MerchantSyncQueue = require('../models/MerchantSyncQueue');
const {
  MERCHANT_CENTER_ID,
  DATA_SOURCE_ID,
  DATA_SOURCE_RESOURCE,
  isSyncEnabled,
  isConfigured,
  getAccountsClient,
  getDataSourcesClient,
  getProductsClient,
} = require('../config/googleMerchant');

const BASE_STORE_URL = process.env.STORE_URL || 'https://aciagro.com';
const BRAND_NAME = 'ACI Agro Solutions';

// Shipping review status constant
const SHIPPING_VERIFICATION_STATUS = 'CODE_REVIEWED_UNVERIFIED_LIVE';

/**
 * Strips HTML tags and collapses whitespace.
 */
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Evaluates product identifiers dynamically:
 * identifierExists = true IF product has valid GTIN OR (both MPN and Brand).
 * Otherwise identifierExists = false.
 */
function evaluateProductIdentifiers(product) {
  const gtin = product.gtin && String(product.gtin).trim() ? String(product.gtin).trim() : null;
  const mpn = (product.mpn && String(product.mpn).trim()) || (product.sku && String(product.sku).trim()) || null;
  const brand = (product.brand && String(product.brand).trim()) || BRAND_NAME;

  const hasGtin = Boolean(gtin);
  const hasMpn = Boolean(mpn);
  const hasBrand = Boolean(brand);

  const identifierExists = hasGtin || (hasMpn && hasBrand);

  return {
    hasGtin,
    hasMpn,
    hasBrand,
    gtin,
    mpn,
    brand,
    identifierExists,
  };
}

/**
 * Maps MongoDB Product document to Google Merchant API products_v1 productInput resource.
 * Schema adheres strictly to Google Merchant API v1:
 * - Top-level: offerId, contentLanguage, feedLabel, productAttributes
 * - productAttributes: title, description, link, imageLink, availability, condition, brand, identifierExists,
 *                      price (amountMicros, currencyCode), productTypes, shipping, gtins (array), mpn
 * - Unsupported top-level channel field is removed.
 */
function mapProductToGoogle(product) {
  const productId = product._id.toString();
  const title = (product.name || '').trim().slice(0, 150);

  // Clean description
  let fullDesc = '';
  if (product.description) fullDesc += stripHtml(product.description);
  if (product.descriptionSections && product.descriptionSections.length > 0) {
    const sectionsText = product.descriptionSections
      .map(s => `${s.title}: ${stripHtml(s.content)}`)
      .join(' | ');
    fullDesc = fullDesc ? `${fullDesc} | ${sectionsText}` : sectionsText;
  }
  if (!fullDesc) {
    fullDesc = `${title} by ${BRAND_NAME}. Premium authentic herbal and agricultural solution.`;
  }
  fullDesc = fullDesc.slice(0, 5000);

  // URLs & Images
  const link = `${BASE_STORE_URL}/products/${product.slug}`;
  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : ['https://aciagro.com/logo.png'];
  const imageLink = images[0];
  const additionalImageLinks = images.slice(1, 11);

  // Price & Availability (Merchant API: amountMicros = price * 1,000,000)
  const priceMicros = String(Math.round((Number(product.price) || 0) * 1000000));
  const isAvailable = product.status === 'Active' && (product.stock === undefined || product.stock > 0);
  const availability = isAvailable ? 'IN_STOCK' : 'OUT_OF_STOCK';

  // Category
  let categoryName = 'Ayurvedic & Herbal Care';
  if (product.category && typeof product.category === 'object' && product.category.name) {
    categoryName = product.category.name;
  }

  // Dynamic Identifier Mapping
  const idInfo = evaluateProductIdentifiers(product);

  const productAttributes = {
    title,
    description: fullDesc,
    link,
    imageLink,
    availability,
    condition: 'NEW',
    brand: idInfo.brand,
    identifierExists: idInfo.identifierExists,
    price: {
      amountMicros: priceMicros,
      currencyCode: 'INR',
    },
    productTypes: [categoryName],
    shipping: [
      {
        price: { amountMicros: '0', currencyCode: 'INR' },
        country: 'IN',
        service: 'Standard Delivery',
        minHandlingTime: '1',
        maxHandlingTime: '2',
        minTransitTime: '2',
        maxTransitTime: '6',
      },
    ],
  };

  // Google Merchant API v1 strongly-typed identifiers: gtins is an array of strings
  if (idInfo.gtin) {
    productAttributes.gtins = [idInfo.gtin];
  }
  if (idInfo.mpn) {
    productAttributes.mpn = idInfo.mpn;
  }
  if (additionalImageLinks.length > 0) {
    productAttributes.additionalImageLinks = additionalImageLinks;
  }

  return {
    offerId: productId,
    contentLanguage: 'en',
    feedLabel: 'IN',
    productAttributes,
  };
}

/**
 * Read-only verification of existing primary data source.
 * Strictly NEVER creates any new data source.
 * If the configured source is missing or invalid, fails safely and reports the error.
 */
async function verifyPrimaryDataSource() {
  if (!isConfigured()) {
    return { configured: false, error: 'Merchant credentials not configured' };
  }

  try {
    const dataSourcesClient = getDataSourcesClient();
    const res = await dataSourcesClient.accounts.dataSources.get({
      name: DATA_SOURCE_RESOURCE,
    });
    return { exists: true, dataSource: res.data };
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    return {
      exists: false,
      error: `Configured data source "${DATA_SOURCE_RESOURCE}" not accessible: ${errMsg}`,
    };
  }
}

/**
 * Checks developer registration status for account 5317000737.
 */
async function checkDeveloperRegistration() {
  if (!isConfigured()) {
    return { configured: false, message: 'Merchant credentials not configured in environment.' };
  }

  try {
    const accountsClient = getAccountsClient();
    const name = `accounts/${MERCHANT_CENTER_ID}/developerRegistration`;
    const res = await accountsClient.accounts.developerRegistration.getDeveloperRegistration({ name });
    return { configured: true, registration: res.data };
  } catch (err) {
    return { configured: true, error: err.response?.data?.error?.message || err.message };
  }
}

/**
 * Persistent Sync Queue: Enqueue product for sync or retry.
 * Guarded by isSyncEnabled(): If sync is disabled, no write is queued.
 */
async function enqueueProductSync(productId, operation = 'UPSERT') {
  if (!isSyncEnabled()) {
    return { enqueued: false, reason: 'Sync disabled (MERCHANT_SYNC_ENABLED is not true)' };
  }

  try {
    const task = await MerchantSyncQueue.findOneAndUpdate(
      { productId },
      {
        operation,
        status: 'PENDING',
        nextRetryAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return { enqueued: true, taskId: task._id };
  } catch (err) {
    console.error(`[GoogleMerchant] Failed to enqueue sync for product ${productId}:`, err.message);
    return { enqueued: false, error: err.message };
  }
}

/**
 * Process persistent sync queue with retry and exponential backoff.
 * Guarded by isSyncEnabled(): If sync is disabled, zero queue processing or API calls occur.
 */
async function processSyncQueue(batchSize = 20) {
  if (!isSyncEnabled()) {
    return { processed: 0, skipped: true, reason: 'Sync disabled (MERCHANT_SYNC_ENABLED is not true)' };
  }

  if (!isConfigured()) {
    return { processed: 0, skipped: true, reason: 'Credentials not configured' };
  }

  const now = new Date();
  const pendingTasks = await MerchantSyncQueue.find({
    status: { $in: ['PENDING', 'FAILED'] },
    nextRetryAt: { $lte: now },
  })
    .populate('productId')
    .limit(batchSize);

  if (pendingTasks.length === 0) return { processed: 0 };

  const productsClient = getProductsClient();
  const parent = `accounts/${MERCHANT_CENTER_ID}`;

  let successCount = 0;
  let failureCount = 0;

  for (const task of pendingTasks) {
    task.status = 'PROCESSING';
    await task.save();

    try {
      const offerId = task.productId._id ? task.productId._id.toString() : task.productId.toString();

      if (task.operation === 'DELETE') {
        // SDK format: accounts/{account}/productInputs/{productInput} where {productInput} is en~IN~{offerId}
        const name = `${parent}/productInputs/en~IN~${offerId}`;
        await productsClient.accounts.productInputs.delete({
          name,
          dataSource: DATA_SOURCE_RESOURCE,
        });
      } else {
        const product = await Product.findById(task.productId).populate('category', 'name');
        if (!product) {
          task.status = 'COMPLETED';
          await task.save();
          continue;
        }

        const productInput = mapProductToGoogle(product);
        await productsClient.accounts.productInputs.insert({
          parent,
          dataSource: DATA_SOURCE_RESOURCE,
          requestBody: productInput,
        });
      }

      task.status = 'COMPLETED';
      task.lastError = null;
      task.attempts.push({ success: true, timestamp: new Date() });
      await task.save();
      successCount++;
    } catch (err) {
      failureCount++;
      const errMsg = err.response?.data?.error?.message || err.message;
      task.retryCount += 1;
      task.lastError = errMsg;
      task.attempts.push({ success: false, error: errMsg, timestamp: new Date() });

      if (task.retryCount >= task.maxRetries) {
        task.status = 'FAILED';
        console.error(`[GoogleMerchant] Max retries exceeded for product ${task.productId}: ${errMsg}`);
      } else {
        task.status = 'FAILED';
        // Exponential backoff: 1m, 2m, 4m, 8m, 16m up to max 1hr
        const backoffMinutes = Math.min(60, Math.pow(2, task.retryCount));
        task.nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
      }
      await task.save();
    }
  }

  return { processed: pendingTasks.length, successCount, failureCount };
}

/**
 * Single product sync with automatic queue enrollment for persistent recovery.
 * Guarded by isSyncEnabled().
 */
async function syncSingleProduct(productIdOrDoc) {
  if (!isSyncEnabled()) {
    return { success: false, skipped: true, reason: 'Sync disabled (MERCHANT_SYNC_ENABLED is not true)' };
  }

  if (!isConfigured()) {
    return { success: false, skipped: true, reason: 'Credentials not configured' };
  }

  const productId = productIdOrDoc._id ? productIdOrDoc._id : productIdOrDoc;
  await enqueueProductSync(productId, 'UPSERT');
  return processSyncQueue(1);
}

/**
 * Single product delete with queue enrollment.
 * Guarded by isSyncEnabled().
 */
async function deleteSingleProduct(productId) {
  if (!isSyncEnabled()) {
    return { success: false, skipped: true, reason: 'Sync disabled (MERCHANT_SYNC_ENABLED is not true)' };
  }

  if (!isConfigured()) {
    return { success: false, skipped: true, reason: 'Credentials not configured' };
  }

  await enqueueProductSync(productId, 'DELETE');
  return processSyncQueue(1);
}

/**
 * Fast, non-blocking price and stock update hook with persistent queue backing.
 * Guarded by isSyncEnabled().
 */
function updateStockAndPrice(productId, newStock, newPrice) {
  if (!isSyncEnabled() || !productId) return;

  enqueueProductSync(productId, 'UPSERT').then(() => {
    if (isConfigured()) {
      setImmediate(() => {
        processSyncQueue(1).catch(err => {
          console.warn('[GoogleMerchant] Asynchronous stock sync attempt logged to queue:', err.message);
        });
      });
    }
  }).catch(e => {
    console.warn('[GoogleMerchant] Queue enqueue warning:', e.message);
  });
}

/**
 * Non-blocking batch stock update notification for orders.
 * Guarded by isSyncEnabled().
 */
function notifyStockUpdate(productIds) {
  if (!isSyncEnabled() || !productIds) return;

  const ids = Array.isArray(productIds) ? productIds : [productIds];
  ids.forEach(id => {
    if (id) updateStockAndPrice(id);
  });
}

/**
 * Dry-run test mapping validator without making any external API calls.
 * Read-only diagnostic operation (available regardless of sync enabled state).
 */
async function validateMappingDryRun() {
  const products = await Product.find({ status: 'Active' })
    .populate('category', 'name')
    .limit(5);

  const results = products.map(p => {
    const mapped = mapProductToGoogle(p);
    const attr = mapped.productAttributes;
    return {
      id: p._id,
      name: p.name,
      offerId: mapped.offerId,
      availability: attr.availability,
      priceMicros: attr.price.amountMicros,
      identifierExists: attr.identifierExists,
      brand: attr.brand,
      gtins: attr.gtins || [],
      shippingPrice: attr.shipping[0].price.amountMicros,
      shippingHandlingTime: `${attr.shipping[0].minHandlingTime}-${attr.shipping[0].maxHandlingTime} days`,
      shippingTransitTime: `${attr.shipping[0].minTransitTime}-${attr.shipping[0].maxTransitTime} days`,
    };
  });

  return {
    sampleCount: results.length,
    samples: results,
    shippingVerificationStatus: SHIPPING_VERIFICATION_STATUS,
    targetDataSource: DATA_SOURCE_RESOURCE,
    syncEnabled: isSyncEnabled(),
  };
}

/**
 * Sync test products (upload 1-2 products).
 * Guarded by isSyncEnabled().
 */
async function syncTestProducts(count = 2) {
  if (!isSyncEnabled()) {
    return {
      disabled: true,
      success: false,
      message: 'Sync is disabled by kill switch (MERCHANT_SYNC_ENABLED is not true). No live products were modified.',
      totalTested: 0,
      results: [],
      errors: [],
    };
  }

  if (!isConfigured()) {
    throw new Error('Google Merchant Center credentials are not configured.');
  }

  const startTime = Date.now();
  const products = await Product.find({ status: 'Active' })
    .populate('category', 'name')
    .limit(count);

  const results = [];
  const errors = [];

  for (const product of products) {
    const res = await syncSingleProduct(product);
    if (res.successCount > 0) {
      results.push({ id: product._id, name: product.name, status: 'synced' });
    } else {
      errors.push({ productId: product._id.toString(), productName: product.name, errorMessage: 'Sync failed' });
      results.push({ id: product._id, name: product.name, status: 'failed' });
    }
  }

  const log = await MerchantSyncLog.create({
    trigger: 'test',
    status: errors.length === 0 ? 'completed' : 'failed',
    totalProducts: products.length,
    successCount: results.filter(r => r.status === 'synced').length,
    failureCount: errors.length,
    syncErrors: errors,
    durationMs: Date.now() - startTime,
    details: `Test upload of ${products.length} products to ${DATA_SOURCE_RESOURCE}`,
  });

  return { logId: log._id, totalTested: products.length, results, errors };
}

/**
 * Bulk sync all active products using products_v1 productInputs.
 * Guarded by isSyncEnabled().
 */
async function syncAllProducts(trigger = 'manual') {
  if (!isSyncEnabled()) {
    return {
      disabled: true,
      success: false,
      message: 'Sync is disabled by kill switch (MERCHANT_SYNC_ENABLED is not true). No live products were modified.',
      totalProducts: 0,
      successCount: 0,
      failureCount: 0,
    };
  }

  if (!isConfigured()) {
    throw new Error('Google Merchant Center credentials are not configured.');
  }

  const startTime = Date.now();
  const products = await Product.find({ status: 'Active' }).populate('category', 'name');

  const log = await MerchantSyncLog.create({
    trigger,
    status: 'in_progress',
    totalProducts: products.length,
  });

  // Enqueue all active products
  for (const prod of products) {
    await enqueueProductSync(prod._id, 'UPSERT');
  }

  // Process the queue
  const queueResult = await processSyncQueue(products.length);

  log.status = queueResult.failureCount === 0 ? 'completed' : (queueResult.successCount > 0 ? 'completed' : 'failed');
  log.successCount = queueResult.successCount || 0;
  log.failureCount = queueResult.failureCount || 0;
  log.durationMs = Date.now() - startTime;
  log.details = `Batch sync finished: ${log.successCount} succeeded, ${log.failureCount} failed for ${DATA_SOURCE_RESOURCE}`;
  await log.save();

  return {
    logId: log._id,
    totalProducts: products.length,
    successCount: log.successCount,
    failureCount: log.failureCount,
    durationMs: log.durationMs,
  };
}

/**
 * Generate Google Merchant Center RSS 2.0 XML feed.
 * Read-only diagnostic / export feed (available regardless of sync enabled state).
 */
async function generateXmlFeed() {
  const products = await Product.find({ status: 'Active' }).populate('category', 'name');

  const escapeXml = (unsafe) => {
    if (!unsafe) return '';
    return unsafe.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(BRAND_NAME)} - Official Product Feed</title>
    <link>${escapeXml(BASE_STORE_URL)}</link>
    <description>Authentic Ayurvedic, Herbal and Agricultural Products by ACI Agro Solutions</description>
`;

  for (const product of products) {
    const mapped = mapProductToGoogle(product);
    const attr = mapped.productAttributes;

    xml += `    <item>
      <g:id>${escapeXml(mapped.offerId)}</g:id>
      <g:title>${escapeXml(attr.title)}</g:title>
      <g:description>${escapeXml(attr.description)}</g:description>
      <g:link>${escapeXml(attr.link)}</g:link>
      <g:image_link>${escapeXml(attr.imageLink)}</g:image_link>
`;

    if (attr.additionalImageLinks) {
      for (const img of attr.additionalImageLinks) {
        xml += `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>\n`;
      }
    }

    xml += `      <g:availability>${attr.availability === 'IN_STOCK' ? 'in stock' : 'out of stock'}</g:availability>
      <g:price>${(Number(attr.price.amountMicros) / 1000000).toFixed(2)} INR</g:price>
      <g:brand>${escapeXml(attr.brand)}</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>${attr.identifierExists ? 'yes' : 'no'}</g:identifier_exists>
      <g:product_type>${escapeXml(attr.productTypes[0])}</g:product_type>
      <g:shipping>
        <g:country>IN</g:country>
        <g:service>Standard Delivery</g:service>
        <g:price>0.00 INR</g:price>
      </g:shipping>
    </item>
`;
  }

  xml += `  </channel>
</rss>`;

  return xml;
}

module.exports = {
  SHIPPING_VERIFICATION_STATUS,
  mapProductToGoogle,
  evaluateProductIdentifiers,
  verifyPrimaryDataSource,
  checkDeveloperRegistration,
  enqueueProductSync,
  processSyncQueue,
  syncSingleProduct,
  deleteSingleProduct,
  updateStockAndPrice,
  notifyStockUpdate,
  validateMappingDryRun,
  syncTestProducts,
  syncAllProducts,
  generateXmlFeed,
};
