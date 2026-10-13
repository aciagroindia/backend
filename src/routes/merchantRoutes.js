const express = require('express');
const router = express.Router();
const merchantController = require('../controllers/merchantController');
const { protect, admin } = require('../middlewares/authMiddleware');
const { checkAdminAccess } = require('../middlewares/checkAdminAccess');

const adminOnly = [protect, admin, checkAdminAccess];

// Public Feed for Google Merchant Center Scheduled Fetch
router.get('/feed.xml', merchantController.getXmlFeed);
router.get('/merchant-feed.xml', merchantController.getXmlFeed);

// Public Read-Only Health & Google Merchant API Connectivity Check (Zero mutations, zero secrets)
router.get('/health', merchantController.getHealth);

// Merchant Sync Triggers (Strictly guarded by MERCHANT_SYNC_ENABLED)
router.get('/sync-test', merchantController.testSync);
router.post('/sync-test', merchantController.testSync);
router.get('/sync-all', merchantController.triggerFullSync);
router.post('/sync-all', merchantController.triggerFullSync);

// Admin Read-Only Audit & Status Routes
router.get('/status', adminOnly, merchantController.getStatus);
router.get('/dry-run', adminOnly, merchantController.getDryRun);
router.get('/developer-registration', adminOnly, merchantController.getDeveloperRegistration);
router.get('/data-source', adminOnly, merchantController.getDataSourceStatus);

// Admin Action Routes (Require Approval & Active Credentials)
router.post('/test-sync', adminOnly, merchantController.testSync);
router.post('/sync', adminOnly, merchantController.triggerFullSync);

module.exports = router;
