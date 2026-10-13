const express = require('express');
const router = express.Router();
const merchantController = require('../controllers/merchantController');
const { protect, admin } = require('../middlewares/authMiddleware');
const { checkAdminAccess } = require('../middlewares/checkAdminAccess');

const adminOnly = [protect, admin, checkAdminAccess];

// Public Feed for Google Merchant Center Scheduled Fetch
router.get('/feed.xml', merchantController.getXmlFeed);
router.get('/merchant-feed.xml', merchantController.getXmlFeed);

// Admin Read-Only Audit & Status Routes
router.get('/status', adminOnly, merchantController.getStatus);
router.get('/dry-run', adminOnly, merchantController.getDryRun);
router.get('/developer-registration', adminOnly, merchantController.getDeveloperRegistration);
router.get('/data-source', adminOnly, merchantController.getDataSourceStatus);

// Admin Action Routes (Require Approval & Active Credentials)
router.post('/test-sync', adminOnly, merchantController.testSync);
router.post('/sync', adminOnly, merchantController.triggerFullSync);

module.exports = router;
