const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
    slug: {
        type: String,
        required: [true, 'Policy slug is required'],
        unique: true,
        trim: true,
        lowercase: true,
        index: true
    },
    title: {
        type: String,
        required: [true, 'Policy title is required'],
        trim: true
    },
    content: {
        type: String,
        required: [true, 'Policy content is required']
    },
    updatedBy: {
        type: String,
        default: 'Admin'
    }
}, { timestamps: true });

module.exports = mongoose.model('Policy', policySchema);
