const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true },
});

const packageSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "1 Month", "Pack of 2", "500ml"
    details: { type: String }, // e.g., "Base Pack", "1L * 1 unit"
    price: { type: Number, required: true },
    regularPrice: { type: Number },
    discount: { type: Number },
    badge: { type: String }, // e.g., "BESTSELLER", "SAVE 10%"
});

const productSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true }, // For the DescriptionSection
    price: { type: Number, required: true },
    category: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Category', 
        required: true 
    },
    images: { type: [String], required: true },
    publicIds: { type: [String], required: true },
    stock: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    unit: { type: String }, // e.g. "1L", "60 Tabs"
    faqs: [faqSchema],
    packages: [packageSchema],
    
    
    // --- UI Matching Fields ---
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    numSales: { type: Number, default: 0 }, // For "Sort by: Best Selling"
    salesCount: { type: Number, default: 0 }, // For homepage best sellers
}, { timestamps: true });

// Virtual for the main image (the first in the array) for backward compatibility
productSchema.virtual('image').get(function() {
    if (this.images && this.images.length > 0) {
        return this.images[0];
    }
    return null; // Or a placeholder image URL
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);