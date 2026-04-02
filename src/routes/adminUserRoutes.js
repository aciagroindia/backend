const express = require("express");
const router = express.Router();
const { getAllUsers } = require("../controllers/adminUserController");
const { protect, admin } = require("../middlewares/authMiddleware");
const { checkAdminAccess } = require("../middlewares/checkAdminAccess");

const adminOnly = [protect, admin, checkAdminAccess];

router.get("/", adminOnly, getAllUsers);

module.exports = router;
