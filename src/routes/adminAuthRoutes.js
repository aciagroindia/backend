const express = require("express");
const router = express.Router();
const { requestAdminAccess } = require("../controllers/adminAuthController.js");
const { validate } = require("../middlewares/validationMiddleware");
const { adminRegisterSchema } = require("../validations/adminAuth.validation.js");

// This route is for an existing user to request admin access from the admin login page.
router.post("/request-access", validate(adminRegisterSchema), requestAdminAccess);

module.exports = router;