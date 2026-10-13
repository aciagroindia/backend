const test = require('node:test');
const assert = require('node:assert/strict');

// Ensure MERCHANT_SYNC_ENABLED is not set or false during this test
delete process.env.MERCHANT_SYNC_ENABLED;

const {
  isSyncEnabled,
  MERCHANT_CENTER_ID,
  DATA_SOURCE_ID,
  DATA_SOURCE_RESOURCE,
} = require('../src/config/googleMerchant');

const merchantSyncService = require('../src/services/merchantSync.service');

test('Google Merchant API - Hard Kill Switch (MERCHANT_SYNC_ENABLED)', async (t) => {
  await t.test('isSyncEnabled defaults to false when env var is unset', () => {
    delete process.env.MERCHANT_SYNC_ENABLED;
    assert.equal(isSyncEnabled(), false);
  });

  await t.test('isSyncEnabled is false for any value other than exact "true"', () => {
    process.env.MERCHANT_SYNC_ENABLED = 'false';
    assert.equal(isSyncEnabled(), false);

    process.env.MERCHANT_SYNC_ENABLED = '0';
    assert.equal(isSyncEnabled(), false);

    process.env.MERCHANT_SYNC_ENABLED = 'TRUE';
    assert.equal(isSyncEnabled(), false);

    process.env.MERCHANT_SYNC_ENABLED = 'enabled';
    assert.equal(isSyncEnabled(), false);

    process.env.MERCHANT_SYNC_ENABLED = '';
    assert.equal(isSyncEnabled(), false);
  });

  await t.test('isSyncEnabled is only true when MERCHANT_SYNC_ENABLED === "true"', () => {
    process.env.MERCHANT_SYNC_ENABLED = 'true';
    assert.equal(isSyncEnabled(), true);

    // Reset back to undefined for all subsequent tests
    delete process.env.MERCHANT_SYNC_ENABLED;
    assert.equal(isSyncEnabled(), false);
  });

  await t.test('enqueueProductSync refuses to write to queue while sync is disabled', async () => {
    delete process.env.MERCHANT_SYNC_ENABLED;
    const res = await merchantSyncService.enqueueProductSync('69d65a4fdf82a64c06fb8bee', 'UPSERT');
    assert.equal(res.enqueued, false);
    assert.match(res.reason, /Sync disabled/);
  });

  await t.test('processSyncQueue aborts with zero processed tasks while sync is disabled', async () => {
    delete process.env.MERCHANT_SYNC_ENABLED;
    const res = await merchantSyncService.processSyncQueue(10);
    assert.equal(res.processed, 0);
    assert.equal(res.skipped, true);
    assert.match(res.reason, /Sync disabled/);
  });

  await t.test('syncSingleProduct aborts safely without API write when disabled', async () => {
    delete process.env.MERCHANT_SYNC_ENABLED;
    const res = await merchantSyncService.syncSingleProduct('69d65a4fdf82a64c06fb8bee');
    assert.equal(res.success, false);
    assert.equal(res.skipped, true);
    assert.match(res.reason, /Sync disabled/);
  });

  await t.test('deleteSingleProduct aborts safely without API write when disabled', async () => {
    delete process.env.MERCHANT_SYNC_ENABLED;
    const res = await merchantSyncService.deleteSingleProduct('69d65a4fdf82a64c06fb8bee');
    assert.equal(res.success, false);
    assert.equal(res.skipped, true);
    assert.match(res.reason, /Sync disabled/);
  });

  await t.test('syncTestProducts returns disabled status and performs 0 uploads when disabled', async () => {
    delete process.env.MERCHANT_SYNC_ENABLED;
    const res = await merchantSyncService.syncTestProducts(2);
    assert.equal(res.disabled, true);
    assert.equal(res.success, false);
    assert.equal(res.totalTested, 0);
    assert.match(res.message, /Sync is disabled by kill switch/);
  });

  await t.test('syncAllProducts returns disabled status and performs 0 uploads when disabled', async () => {
    delete process.env.MERCHANT_SYNC_ENABLED;
    const res = await merchantSyncService.syncAllProducts('cron');
    assert.equal(res.disabled, true);
    assert.equal(res.success, false);
    assert.equal(res.totalProducts, 0);
    assert.equal(res.successCount, 0);
    assert.match(res.message, /Sync is disabled by kill switch/);
  });

  await t.test('updateStockAndPrice and notifyStockUpdate do not enqueue while disabled', () => {
    delete process.env.MERCHANT_SYNC_ENABLED;
    // Calling these with sync disabled must safely return without errors or external writes
    assert.doesNotThrow(() => {
      merchantSyncService.updateStockAndPrice('69d65a4fdf82a64c06fb8bee', 5, 699);
      merchantSyncService.notifyStockUpdate(['69d65a4fdf82a64c06fb8bee']);
      merchantSyncService.notifyStockUpdate(null);
    });
  });
});

test('Google Merchant API - Data Source Parameter & Resource Safety', async (t) => {
  await t.test('Data Source uses exact configured ID 10769000507 and full resource path', () => {
    assert.equal(MERCHANT_CENTER_ID, '5317000737');
    assert.equal(DATA_SOURCE_ID, '10769000507');
    assert.equal(DATA_SOURCE_RESOURCE, 'accounts/5317000737/dataSources/10769000507');
  });

  await t.test('verifyPrimaryDataSource fails safely if credentials not configured without creating source', async () => {
    delete process.env.MERCHANT_SYNC_ENABLED;
    const res = await merchantSyncService.verifyPrimaryDataSource();
    assert.equal(res.configured, false);
    assert.ok(res.error);
  });
});
