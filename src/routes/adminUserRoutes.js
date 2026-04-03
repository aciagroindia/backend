const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById } = require('../controllers/adminUserController');

// Import authentication and authorization middleware
const { protect, admin } = require('../middlewares/authMiddleware');
const { checkAdminAccess } = require('../middlewares/checkAdminAccess');

// This middleware array will protect the routes, ensuring only approved admins can access them.
const adminOnly = [protect, admin, checkAdminAccess];

// Route to get all users, used by your CustomersPage
router.get('/', adminOnly, getAllUsers);

// Optional: Route to get a single user by ID
router.get('/:id', adminOnly, getUserById);

module.exports = router;