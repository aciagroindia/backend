const settingsService = require('../services/settings.service');

// A simple wrapper to catch errors in async routes
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// @desc    Get admin profile
// @route   GET /api/admin/settings/profile
// @access  Private/Admin
exports.getProfile = asyncHandler(async (req, res) => {
    const profile = await settingsService.getAdminProfile(req.user.id);
    res.json({ success: true, data: profile });
});

// @desc    Update admin profile (name, email)
// @route   PUT /api/admin/settings/profile
// @access  Private/Admin
exports.updateProfile = asyncHandler(async (req, res) => {
    const updatedProfile = await settingsService.updateAdminProfile(req.user.id, req.body, null);
    res.json({ success: true, data: updatedProfile });
});

// @desc    Update admin avatar (Fix: Save directly to DB as Base64)
// @route   PUT /api/admin/settings/avatar
// @access  Private/Admin
exports.updateAvatar = asyncHandler(async (req, res) => {
    // Agar file select nahi ki hai toh error bhej dein
    if (!req.file) {
        return res.status(400).json({ success: false, message: "Please upload an image file" });
    }

    // Seedha req.file bhej rahe hain, ab aapki service file iska buffer nikal kar Cloudinary par upload kar degi!
    const updatedProfile = await settingsService.updateAdminProfile(req.user.id, {}, req.file);
    res.json({ success: true, data: updatedProfile });
});

// @desc    Change admin password
// @route   PUT /api/admin/settings/password
// @access  Private/Admin
exports.changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await settingsService.changeAdminPassword(req.user.id, currentPassword, newPassword);
    res.json({ success: true, ...result });
});

// @desc    Get admin preferences
// @route   GET /api/admin/settings/preferences
// @access  Private/Admin
exports.getPreferences = asyncHandler(async (req, res) => {
    const preferences = await settingsService.getAdminPreferences(req.user.id);
    res.json({ success: true, data: preferences });
});

// @desc    Update admin preferences
// @route   PUT /api/admin/settings/preferences
// @access  Private/Admin
exports.updatePreferences = asyncHandler(async (req, res) => {
    const updatedPreferences = await settingsService.updateAdminPreferences(req.user.id, req.body);
    res.json({ success: true, data: updatedPreferences });
});