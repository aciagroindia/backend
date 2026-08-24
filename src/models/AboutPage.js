const mongoose = require('mongoose');

const metricItemSchema = new mongoose.Schema({
    value: { type: String, required: true },
    label: { type: String, required: true }
}, { _id: false });

const customSectionSchema = new mongoose.Schema({
    id: { type: String, required: true },
    title: { type: String, default: '' },
    tag: { type: String, default: '' },
    content: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    imagePublicId: { type: String, default: '' },
    layout: { 
        type: String, 
        enum: ['center', 'split-left', 'split-right', 'banner'], 
        default: 'center' 
    },
    bgType: { 
        type: String, 
        enum: ['color', 'image'], 
        default: 'color' 
    },
    bgColor: { type: String, default: '#ffffff' },
    bgImage: { type: String, default: '' },
    bgPublicId: { type: String, default: '' },
    headingColor: { type: String, default: '#111827' },
    textColor: { type: String, default: '#4b5563' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, { _id: false });

const aboutPageSchema = new mongoose.Schema({
    hero: {
        title: { type: String, default: 'Rooted in Ayurveda. Crafted for Modern Life.' },
        subtitle: { type: String, default: 'We blend ancient Ayurvedic wisdom with modern science to create pure, effective, and sustainable wellness products.' },
        bgType: { type: String, enum: ['color', 'image'], default: 'image' },
        bgColor: { type: String, default: '#14854e' },
        bgImage: { type: String, default: '/banner1.jpg' },
        bgPublicId: { type: String, default: '' },
        textColor: { type: String, default: '#ffffff' },
        isActive: { type: Boolean, default: true }
    },
    story: {
        title: { type: String, default: 'Our Story' },
        paragraphs: {
            type: [String],
            default: [
                'Our journey began with a simple belief — true wellness comes from nature. Inspired by centuries-old Ayurvedic formulations, we set out to create products that are safe, transparent, and deeply rooted in tradition.',
                'Every product is thoughtfully crafted using ethically sourced herbs, carefully tested, and formulated to restore balance to your body and mind.'
            ]
        },
        bgType: { type: String, enum: ['color', 'image'], default: 'color' },
        bgColor: { type: String, default: '#f3f9f6' },
        bgImage: { type: String, default: '' },
        bgPublicId: { type: String, default: '' },
        headingColor: { type: String, default: '#14854e' },
        textColor: { type: String, default: '#374151' },
        isActive: { type: Boolean, default: true }
    },
    philosophy: {
        title: { type: String, default: 'The Ayurvedic Philosophy' },
        description: { type: String, default: 'Ayurveda teaches balance — balance of body, mind, and spirit. Our formulations are designed to support natural healing using time-tested herbs without harmful chemicals.' },
        imageUrl: { type: String, default: '/certifiedIcons/whychooseus.png' },
        imagePublicId: { type: String, default: '' },
        imagePosition: { type: String, enum: ['left', 'right'], default: 'left' },
        bgType: { type: String, enum: ['color', 'image'], default: 'color' },
        bgColor: { type: String, default: '#fffdf8' },
        bgImage: { type: String, default: '' },
        bgPublicId: { type: String, default: '' },
        headingColor: { type: String, default: '#111827' },
        textColor: { type: String, default: '#4b5563' },
        isActive: { type: Boolean, default: true }
    },
    ingredients: {
        title: { type: String, default: 'Pure Ingredients. Ethical Sourcing.' },
        description: { type: String, default: 'We work directly with trusted farmers to source organic herbs. No parabens. No sulfates. No synthetic toxins.' },
        bgType: { type: String, enum: ['color', 'image'], default: 'color' },
        bgColor: { type: String, default: '#f3f9f6' },
        bgImage: { type: String, default: '' },
        bgPublicId: { type: String, default: '' },
        headingColor: { type: String, default: '#111827' },
        textColor: { type: String, default: '#4b5563' },
        isActive: { type: Boolean, default: true }
    },
    quality: {
        title: { type: String, default: 'Quality & Safety First' },
        description: { type: String, default: 'Manufactured in GMP-certified facilities and tested for purity, potency, and safety before reaching your home.' },
        bgType: { type: String, enum: ['color', 'image'], default: 'color' },
        bgColor: { type: String, default: '#fffdf8' },
        bgImage: { type: String, default: '' },
        bgPublicId: { type: String, default: '' },
        headingColor: { type: String, default: '#111827' },
        textColor: { type: String, default: '#4b5563' },
        isActive: { type: Boolean, default: true }
    },
    metrics: {
        items: {
            type: [metricItemSchema],
            default: [
                { value: '10,000+', label: 'Happy Customers' },
                { value: '4.8★', label: 'Average Rating' },
                { value: '100%', label: 'Natural Ingredients' }
            ]
        },
        bgType: { type: String, enum: ['color', 'image'], default: 'color' },
        bgColor: { type: String, default: '#14854e' },
        bgImage: { type: String, default: '' },
        bgPublicId: { type: String, default: '' },
        textColor: { type: String, default: '#ffffff' },
        isActive: { type: Boolean, default: true }
    },
    closing: {
        title: { type: String, default: 'Experience the Power of Nature 🌿' },
        subtitle: { type: String, default: 'Join thousands who trust us for authentic Ayurvedic wellness.' },
        bgType: { type: String, enum: ['color', 'image'], default: 'color' },
        bgColor: { type: String, default: '#f3f9f6' },
        bgImage: { type: String, default: '' },
        bgPublicId: { type: String, default: '' },
        headingColor: { type: String, default: '#111827' },
        textColor: { type: String, default: '#4b5563' },
        isActive: { type: Boolean, default: true }
    },
    customSections: {
        type: [customSectionSchema],
        default: []
    }
}, { timestamps: true });

module.exports = mongoose.model('AboutPage', aboutPageSchema);
