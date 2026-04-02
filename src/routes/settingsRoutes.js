const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const { protect, admin } = require("../middlewares/authMiddleware");
const { checkAdminAccess } = require("../middlewares/checkAdminAccess");
const { validate } = require("../middlewares/validationMiddleware");
const upload = require("../middlewares/uploadMiddleware");
const {
  updateProfileSchema,
  changePasswordSchema,
  updatePreferencesSchema,
} = require("../validations/settings.validation");

const adminOnly = [protect, admin, checkAdminAccess];

// Profile Routes
router.get("/profile", adminOnly, settingsController.getProfile);

// This route now only handles text data (name, email)
router.put(
  "/profile",
  adminOnly,
  validate(updateProfileSchema),
  settingsController.updateProfile
);

// This new route handles only the avatar upload
router.put(
  "/avatar",
  adminOnly,
  upload.single("avatar"),
  settingsController.updateAvatar
);

// Security Routes
router.put("/password", adminOnly, validate(changePasswordSchema), settingsController.changePassword);

// Preferences Routes
router.get("/preferences", adminOnly, settingsController.getPreferences);
router.put(
  "/preferences",
  adminOnly,
  validate(updatePreferencesSchema),
  settingsController.updatePreferences
);

module.exports = router;