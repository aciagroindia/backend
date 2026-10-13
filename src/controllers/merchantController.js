const merchantSyncService = require('../services/merchantSync.service');
const MerchantSyncLog = require('../models/MerchantSyncLog');
const MerchantSyncQueue = require('../models/MerchantSyncQueue');
const Product = require('../models/Product');
const {
  isConfigured,
  isSyncEnabled,
  MERCHANT_CENTER_ID,
  DATA_SOURCE_ID,
  DATA_SOURCE_RESOURCE,
} = require('../config/googleMerchant');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @desc Get Merchant Center integration status, auth method, and queue stats
 * @route GET /api/admin/merchant/status
 */
exports.getStatus = asyncHandler(async (req, res) => {
  const configured = isConfigured();
  const syncEnabled = isSyncEnabled();
  const totalActiveProducts = await Product.countDocuments({ status: 'Active' });
  const recentLogs = await MerchantSyncLog.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const [pendingQueue, failedQueue, completedQueue] = await Promise.all([
    MerchantSyncQueue.countDocuments({ status: 'PENDING' }),
    MerchantSyncQueue.countDocuments({ status: 'FAILED' }),
    MerchantSyncQueue.countDocuments({ status: 'COMPLETED' }),
  ]);

  res.json({
    success: true,
    data: {
      merchantCenterId: MERCHANT_CENTER_ID,
      dataSourceId: DATA_SOURCE_ID,
      dataSourceResource: DATA_SOURCE_RESOURCE,
      apiTarget: 'Google Merchant API (v1)',
      syncEnabled,
      isConfigured: configured,
      totalActiveProducts,
      shippingVerificationStatus: merchantSyncService.SHIPPING_VERIFICATION_STATUS,
      queueStats: {
        pending: pendingQueue,
        failed: failedQueue,
        completed: completedQueue,
      },
      authMethod: process.env.GOOGLE_CLIENT_ID ? 'OAuth2' : (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_PATH ? 'ServiceAccount' : 'NotConfigured'),
      recentLogs,
    },
  });
});

/**
 * @desc Dry-run mapping test (Zero live mutations)
 * @route GET /api/admin/merchant/dry-run
 */
exports.getDryRun = asyncHandler(async (req, res) => {
  const dryRunData = await merchantSyncService.validateMappingDryRun();
  res.json({
    success: true,
    data: dryRunData,
  });
});

/**
 * @desc Check developer registration status (Read-only)
 * @route GET /api/admin/merchant/developer-registration
 */
exports.getDeveloperRegistration = asyncHandler(async (req, res) => {
  const regStatus = await merchantSyncService.checkDeveloperRegistration();
  res.json({
    success: true,
    data: regStatus,
  });
});

/**
 * @desc Check existing data source verification (Read-only, never creates)
 * @route GET /api/admin/merchant/data-source
 */
exports.getDataSourceStatus = asyncHandler(async (req, res) => {
  const dsStatus = await merchantSyncService.verifyPrimaryDataSource();
  res.json({
    success: true,
    data: dsStatus,
  });
});

/**
 * @desc Test upload 1 or 2 products
 * Guarded: Returns disabled status if MERCHANT_SYNC_ENABLED is not true
 * @route POST /api/admin/merchant/test-sync
 */
exports.testSync = asyncHandler(async (req, res) => {
  if (!isSyncEnabled()) {
    return res.status(200).json({
      success: false,
      disabled: true,
      message: 'Sync is disabled by kill switch (MERCHANT_SYNC_ENABLED is not true). No live products were modified.',
    });
  }

  const count = Number(req.body.count) || 2;
  const result = await merchantSyncService.syncTestProducts(count);
  res.json({
    success: true,
    message: `Test sync completed for ${result.totalTested} product(s).`,
    data: result,
  });
});

/**
 * @desc Trigger full sync
 * Guarded: Returns disabled status if MERCHANT_SYNC_ENABLED is not true
 * @route POST /api/admin/merchant/sync
 */
exports.triggerFullSync = asyncHandler(async (req, res) => {
  if (!isSyncEnabled()) {
    return res.status(200).json({
      success: false,
      disabled: true,
      message: 'Sync is disabled by kill switch (MERCHANT_SYNC_ENABLED is not true). No live products were modified.',
    });
  }

  const result = await merchantSyncService.syncAllProducts('manual');
  res.json({
    success: true,
    message: `Full Merchant Center sync completed: ${result.successCount} succeeded, ${result.failureCount} failed.`,
    data: result,
  });
});

/**
 * @desc Serves Google Shopping RSS 2.0 XML Feed
 * @route GET /api/products/merchant-feed.xml
 */
exports.getXmlFeed = asyncHandler(async (req, res) => {
  const xml = await merchantSyncService.generateXmlFeed();
  res.set('Content-Type', 'application/xml; charset=utf-8');
  res.send(xml);
});
