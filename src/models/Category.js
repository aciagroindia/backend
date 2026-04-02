const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    image: { type: String, required: true }, // Cloudinary URL
    publicId: { type: String, required: true }, // For Cloudinary cleanup
    description: { type: String }, // Stores Tiptap HTML content
    status: { 
        type: String, 
        enum: ['Active', 'Inactive'], 
        default: 'Active' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);