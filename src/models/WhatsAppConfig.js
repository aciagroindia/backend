const mongoose = require('mongoose');

const whatsAppConfigSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        default: '919876543210',
        trim: true
    },
    message: {
        type: String,
        default: 'Hello ACI Agro Solutions, I would like to inquire about your ayurvedic products.',
        trim: true
    },
    customUrl: {
        type: String,
        default: '',
        trim: true
    },
    isEnabled: {
        type: Boolean,
        default: true
    },
    updatedBy: {
        type: String,
        default: 'Admin'
    }
}, { timestamps: true });

module.exports = mongoose.model('WhatsAppConfig', whatsAppConfigSchema);
