const cron = require('node-cron');
const merchantSyncService = require('./merchantSync.service');
const { isConfigured, isSyncEnabled } = require('../config/googleMerchant');

/**
 * Initializes Google Merchant Center automated periodic sync cron job.
 * Runs daily at 03:00 AM server time (or customizable via MERCH_SYNC_CRON).
 * Hard-guarded: Only executes if MERCHANT_SYNC_ENABLED === 'true' and credentials exist.
 */
function initMerchantCron() {
  const cronExpression = process.env.MERCHANT_SYNC_CRON || '0 3 * * *'; // Default 3:00 AM daily

  console.log(`[GoogleMerchant] Scheduler initialized with expression: "${cronExpression}" (Enabled: ${isSyncEnabled()})`);

  cron.schedule(cronExpression, async () => {
    console.log('[GoogleMerchant] Checking scheduled daily product sync...');
    if (!isSyncEnabled()) {
      console.log('[GoogleMerchant] Scheduled sync skipped: Sync is disabled (MERCHANT_SYNC_ENABLED is not true).');
      return;
    }

    if (!isConfigured()) {
      console.log('[GoogleMerchant] Scheduled sync skipped: Merchant API not configured.');
      return;
    }

    try {
      const result = await merchantSyncService.syncAllProducts('cron');
      console.log(`[GoogleMerchant] Scheduled sync completed: ${result.successCount} succeeded, ${result.failureCount} failed.`);
    } catch (err) {
      console.error('[GoogleMerchant] Scheduled sync encountered error:', err.message);
    }
  });
}

module.exports = {
  initMerchantCron,
};
