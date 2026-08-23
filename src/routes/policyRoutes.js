const express = require('express');
const router = express.Router();
const {
    getPolicies,
    getPolicyBySlug,
    updatePolicy
} = require('../controllers/policyController');

const { protect, admin } = require('../middlewares/authMiddleware');
const { checkAdminAccess } = require('../middlewares/checkAdminAccess');

// Public routes
router.get('/', getPolicies);
router.get('/:slug', getPolicyBySlug);

// Admin protected routes
const adminOnly = [protect, admin, checkAdminAccess];
router.put('/:slug', adminOnly, updatePolicy);
router.post('/:slug', adminOnly, updatePolicy);

module.exports = router;
