/**
 * Google Merchant Center Management & Sync CLI Tool (Merchant API v1)
 * Usage:
 *   node src/scripts/merchantSyncCli.js --help
 *   node src/scripts/merchantSyncCli.js --status
 *   node src/scripts/merchantSyncCli.js --dry-run
 *   node src/scripts/merchantSyncCli.js --verify-source
 *   node src/scripts/merchantSyncCli.js --xml-feed
 *   node src/scripts/merchantSyncCli.js --test
 *   node src/scripts/merchantSyncCli.js --sync-all
 */

const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();
const mongoose = require('mongoose');
const {
  MERCHANT_CENTER_ID,
  DATA_SOURCE_ID,
  DATA_SOURCE_RESOURCE,
  isSyncEnabled,
  isConfigured,
  getAccountsClient,
} = require('../config/googleMerchant');
const merchantSyncService = require('../services/merchantSync.service');
const Product = require('../models/Product');
const MerchantSyncQueue = require('../models/MerchantSyncQueue');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || '--status';

  console.log('====================================================');
  console.log('ACI AGRO SOLUTION - GOOGLE MERCHANT API TOOL (v1)');
  console.log(`Target Merchant Center ID: ${MERCHANT_CENTER_ID}`);
  console.log(`Target Data Source: ${DATA_SOURCE_RESOURCE}`);
  console.log('====================================================\n');

  if (command === '--help') {
    console.log(`Available commands:
  --status         Check configuration, kill switch state, active products, and queue statistics
  --dry-run        Run read-only mapping validation on sample products
  --verify-source  Verify configured data source existence (read-only, never creates)
  --xml-feed       Generate and inspect Google Shopping RSS feed XML
  --test           Upload 1-2 test products (Guarded by MERCHANT_SYNC_ENABLED)
  --sync-all       Upload all active products (Guarded by MERCHANT_SYNC_ENABLED)
`);
    process.exit(0);
  }

  // Connect DB
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB database.');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }

  try {
    if (command === '--status') {
      const configured = isConfigured();
      const syncEnabled = isSyncEnabled();
      const activeProductsCount = await Product.countDocuments({ status: 'Active' });
      const totalProductsCount = await Product.countDocuments();
      const pendingQueue = await MerchantSyncQueue.countDocuments({ status: 'PENDING' });
      const failedQueue = await MerchantSyncQueue.countDocuments({ status: 'FAILED' });

      console.log(`\nConfiguration Status:`);
      console.log(`- API Target: Google Merchant API (Stable v1)`);
      console.log(`- Configured (Credentials exist): ${configured ? 'YES' : 'NO'}`);
      console.log(`- Kill Switch (MERCHANT_SYNC_ENABLED): ${syncEnabled ? 'ENABLED (true)' : 'DISABLED (false / not set)'}`);
      console.log(`- Merchant Center ID: ${MERCHANT_CENTER_ID}`);
      console.log(`- Data Source Resource: ${DATA_SOURCE_RESOURCE}`);
      console.log(`- Total Products in DB: ${totalProductsCount}`);
      console.log(`- Active Products to Sync: ${activeProductsCount}`);
      console.log(`- Shipping Review Status: ${merchantSyncService.SHIPPING_VERIFICATION_STATUS}`);
      console.log(`- Persistent Queue Status: ${pendingQueue} Pending, ${failedQueue} Failed`);

      if (!configured) {
        console.log('\n[!] Merchant API credentials are not yet set in .env.');
        console.log('Supported Auth Methods:');
        console.log('  Option A (Recommended for Render when Service Account keys blocked):');
        console.log('    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN');
        console.log('  Option B (Service Account JSON):');
        console.log('    GOOGLE_SERVICE_ACCOUNT_KEY (or GOOGLE_SERVICE_ACCOUNT_PATH)');
      } else {
        console.log('\nTesting connection with Google Merchant API accounts_v1...');
        try {
          const accounts = getAccountsClient();
          const res = await accounts.accounts.get({
            name: `accounts/${MERCHANT_CENTER_ID}`,
          });
          console.log(`[SUCCESS] Connected to Merchant Account: ${res.data.accountName || res.data.name}`);
        } catch (apiErr) {
          console.log(`[NOTE] API Ping response:`, apiErr.message);
        }
      }
    } else if (command === '--dry-run') {
      console.log('\nExecuting Read-Only Mapping Dry-Run on active products...');
      const dryRun = await merchantSyncService.validateMappingDryRun();
      console.log('\nMapping Results (Sample Products):');
      dryRun.samples.forEach((sample, idx) => {
        console.log(`\n[${idx + 1}] Product: "${sample.name}" (ID: ${sample.offerId})`);
        console.log(`    Availability: ${sample.availability}`);
        console.log(`    Price Micros: ${sample.priceMicros} (₹${(sample.priceMicros / 1000000).toFixed(2)})`);
        console.log(`    Brand: ${sample.brand}`);
        console.log(`    GTINs: ${JSON.stringify(sample.gtins)}`);
        console.log(`    Identifier Exists: ${sample.identifierExists}`);
        console.log(`    Shipping: ₹${sample.shippingPrice / 1000000} (Handling: ${sample.shippingHandlingTime}, Transit: ${sample.shippingTransitTime})`);
      });
      console.log(`\nShipping Verification Status: ${dryRun.shippingVerificationStatus}`);
      console.log(`Target Data Source: ${dryRun.targetDataSource}`);
      console.log(`Sync Enabled: ${dryRun.syncEnabled}`);
    } else if (command === '--verify-source') {
      console.log(`\nVerifying existence of configured data source ${DATA_SOURCE_RESOURCE}...`);
      const dsResult = await merchantSyncService.verifyPrimaryDataSource();
      console.log('Data Source Status:', JSON.stringify(dsResult, null, 2));
    } else if (command === '--xml-feed') {
      console.log('\nGenerating Google Merchant RSS 2.0 XML Feed...');
      const xml = await merchantSyncService.generateXmlFeed();
      console.log(xml.slice(0, 1500) + '\n... [truncated]');
      console.log(`\nTotal XML length: ${xml.length} characters.`);
    } else if (command === '--test') {
      if (!isSyncEnabled()) {
        console.log('\n[BLOCKED BY KILL SWITCH] MERCHANT_SYNC_ENABLED is not true.');
        console.log('Zero live Google Merchant API writes were performed.');
        process.exit(0);
      }
      console.log('\nExecuting test sync...');
      const result = await merchantSyncService.syncTestProducts(2);
      console.log('Test Sync Results:', JSON.stringify(result, null, 2));
    } else if (command === '--sync-all') {
      if (!isSyncEnabled()) {
        console.log('\n[BLOCKED BY KILL SWITCH] MERCHANT_SYNC_ENABLED is not true.');
        console.log('Zero live Google Merchant API writes were performed.');
        process.exit(0);
      }
      console.log('\nExecuting full sync...');
      const result = await merchantSyncService.syncAllProducts('manual');
      console.log('Full Sync Completed:', JSON.stringify(result, null, 2));
    } else {
      console.log(`Unknown command: ${command}. Run with --help for options.`);
    }
  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
