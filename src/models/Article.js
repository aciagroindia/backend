const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true }
}, { _id: false });

const articleSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'Article title is required'],
        trim: true
    },
    slug: { 
        type: String, 
        required: [true, 'Article slug is required'], 
        unique: true, 
        trim: true,
        lowercase: true,
        index: true
    },
    breadcrumbTitle: { 
        type: String, 
        trim: true 
    },
    description: { 
        type: String, 
        required: [true, 'Short description / excerpt is required'],
        trim: true 
    },
    content: { 
        type: String, 
        required: [true, 'Article content is required'] 
    },
    image: { 
        type: String, 
        required: [true, 'Featured image is required'] 
    },
    imagePublicId: { 
        type: String 
    },
    author: { 
        type: String, 
        default: 'ACI Ayurveda' 
    },
    category: { 
        type: String, 
        default: 'Ayurvedic Wellness' 
    },
    tags: [{ 
        type: String, 
        trim: true 
    }],
    status: { 
        type: String, 
        enum: ['Published', 'Draft'], 
        default: 'Published',
        index: true
    },
    faqs: [faqSchema],
    views: { 
        type: Number, 
        default: 0 
    }
}, { timestamps: true });

module.exports = mongoose.model('Article', articleSchema);
