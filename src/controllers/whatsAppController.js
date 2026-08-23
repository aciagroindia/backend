const WhatsAppConfig = require('../models/WhatsAppConfig');
const createError = require('http-errors');

// Default fallback configuration
const DEFAULT_CONFIG = {
    phoneNumber: '919876543210',
    message: 'Hello ACI Agro Solutions, I would like to inquire about your ayurvedic products.',
    customUrl: '',
    isEnabled: true
};

// @desc    Get WhatsApp configuration (Public)
// @route   GET /api/config/whatsapp
exports.getWhatsAppConfig = async (req, res, next) => {
    try {
        let config = await WhatsAppConfig.findOne({}).lean();
        if (!config) {
            config = DEFAULT_CONFIG;
        }

        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update WhatsApp configuration (Admin only)
// @route   PUT /api/admin/config/whatsapp
exports.updateWhatsAppConfig = async (req, res, next) => {
    try {
        const { phoneNumber, message, customUrl, isEnabled } = req.body;

        const updateData = {};
        if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber.trim();
        if (message !== undefined) updateData.message = message.trim();
        if (customUrl !== undefined) updateData.customUrl = customUrl.trim();
        if (isEnabled !== undefined) updateData.isEnabled = Boolean(isEnabled);
        updateData.updatedBy = req.user?.name || 'Admin';

        let config = await WhatsAppConfig.findOneAndUpdate(
            {},
            updateData,
            { upsert: true, new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'WhatsApp settings updated successfully.',
            data: config
        });
    } catch (error) {
        next(error);
    }
};
