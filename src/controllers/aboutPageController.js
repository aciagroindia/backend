const AboutPage = require('../models/AboutPage');
const { cloudinary } = require('../config/cloudinary');
const createError = require('http-errors');

const DEFAULT_ABOUT_PAGE = {
    hero: {
        title: 'Rooted in Ayurveda. Crafted for Modern Life.',
        subtitle: 'We blend ancient Ayurvedic wisdom with modern science to create pure, effective, and sustainable wellness products.',
        bgType: 'image',
        bgColor: '#14854e',
        bgImage: '/banner1.jpg',
        bgPublicId: '',
        textColor: '#ffffff',
        isActive: true
    },
    story: {
        title: 'Our Story',
        paragraphs: [
            'Our journey began with a simple belief — true wellness comes from nature. Inspired by centuries-old Ayurvedic formulations, we set out to create products that are safe, transparent, and deeply rooted in tradition.',
            'Every product is thoughtfully crafted using ethically sourced herbs, carefully tested, and formulated to restore balance to your body and mind.'
        ],
        bgType: 'color',
        bgColor: '#f3f9f6',
        bgImage: '',
        bgPublicId: '',
        headingColor: '#14854e',
        textColor: '#374151',
        isActive: true
    },
    philosophy: {
        title: 'The Ayurvedic Philosophy',
        description: 'Ayurveda teaches balance — balance of body, mind, and spirit. Our formulations are designed to support natural healing using time-tested herbs without harmful chemicals.',
        imageUrl: '/certifiedIcons/whychooseus.png',
        imagePublicId: '',
        imagePosition: 'left',
        bgType: 'color',
        bgColor: '#fffdf8',
        bgImage: '',
        bgPublicId: '',
        headingColor: '#111827',
        textColor: '#4b5563',
        isActive: true
    },
    ingredients: {
        title: 'Pure Ingredients. Ethical Sourcing.',
        description: 'We work directly with trusted farmers to source organic herbs. No parabens. No sulfates. No synthetic toxins.',
        bgType: 'color',
        bgColor: '#f3f9f6',
        bgImage: '',
        bgPublicId: '',
        headingColor: '#111827',
        textColor: '#4b5563',
        isActive: true
    },
    quality: {
        title: 'Quality & Safety First',
        description: 'Manufactured in GMP-certified facilities and tested for purity, potency, and safety before reaching your home.',
        bgType: 'color',
        bgColor: '#fffdf8',
        bgImage: '',
        bgPublicId: '',
        headingColor: '#111827',
        textColor: '#4b5563',
        isActive: true
    },
    metrics: {
        items: [
            { value: '10,000+', label: 'Happy Customers' },
            { value: '4.8★', label: 'Average Rating' },
            { value: '100%', label: 'Natural Ingredients' }
        ],
        bgType: 'color',
        bgColor: '#14854e',
        bgImage: '',
        bgPublicId: '',
        textColor: '#ffffff',
        isActive: true
    },
    closing: {
        title: 'Experience the Power of Nature 🌿',
        subtitle: 'Join thousands who trust us for authentic Ayurvedic wellness.',
        bgType: 'color',
        bgColor: '#f3f9f6',
        bgImage: '',
        bgPublicId: '',
        headingColor: '#111827',
        textColor: '#4b5563',
        isActive: true
    },
    customSections: []
};

// @desc    Get About Page configuration (Public)
// @route   GET /api/about-page
exports.getAboutPageConfig = async (req, res, next) => {
    try {
        let config = await AboutPage.findOne({});
        if (!config) {
            config = await AboutPage.create(DEFAULT_ABOUT_PAGE);
        }

        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        next(error);
    }
};

// Helper to safely parse JSON if string
const parseIfString = (val) => {
    if (typeof val === 'string') {
        try {
            return JSON.parse(val);
        } catch (e) {
            return val;
        }
    }
    return val;
};

// @desc    Update About Page configuration (Admin only)
// @route   PUT /api/about-page
exports.updateAboutPageConfig = async (req, res, next) => {
    try {
        let config = await AboutPage.findOne({});
        if (!config) {
            config = new AboutPage(DEFAULT_ABOUT_PAGE);
        }

        // 1. Process Core Sections from body
        const sections = ['hero', 'story', 'philosophy', 'ingredients', 'quality', 'metrics', 'closing'];
        for (const sec of sections) {
            if (req.body[sec] !== undefined) {
                const parsed = parseIfString(req.body[sec]);
                if (parsed && typeof parsed === 'object') {
                    config[sec] = { ...config[sec]?.toObject?.() || config[sec], ...parsed };
                }
            }
        }

        // 2. Process Custom Sections
        if (req.body.customSections !== undefined) {
            const parsedCustom = parseIfString(req.body.customSections);
            if (Array.isArray(parsedCustom)) {
                config.customSections = parsedCustom;
            }
        }

        // 3. Process File Uploads (Mapped by fieldname)
        const filesMap = {};
        if (req.files) {
            if (Array.isArray(req.files)) {
                req.files.forEach(f => {
                    filesMap[f.fieldname] = f;
                });
            } else if (typeof req.files === 'object') {
                Object.keys(req.files).forEach(key => {
                    const fileArr = req.files[key];
                    if (Array.isArray(fileArr) && fileArr[0]) {
                        filesMap[key] = fileArr[0];
                    } else if (fileArr && fileArr.path) {
                        filesMap[key] = fileArr;
                    }
                });
            }
        } else if (req.file) {
            filesMap[req.file.fieldname || 'file'] = req.file;
        }

        // Handle Hero Background upload
        if (filesMap['hero_bg']) {
            if (config.hero.bgPublicId) {
                try { await cloudinary.uploader.destroy(config.hero.bgPublicId); } catch (e) {}
            }
            config.hero.bgImage = filesMap['hero_bg'].path;
            config.hero.bgPublicId = filesMap['hero_bg'].filename;
            config.hero.bgType = 'image';
        }

        // Handle Philosophy Image upload
        if (filesMap['philosophy_image']) {
            if (config.philosophy.imagePublicId) {
                try { await cloudinary.uploader.destroy(config.philosophy.imagePublicId); } catch (e) {}
            }
            config.philosophy.imageUrl = filesMap['philosophy_image'].path;
            config.philosophy.imagePublicId = filesMap['philosophy_image'].filename;
        }

        // Handle Story Background upload
        if (filesMap['story_bg']) {
            if (config.story.bgPublicId) {
                try { await cloudinary.uploader.destroy(config.story.bgPublicId); } catch (e) {}
            }
            config.story.bgImage = filesMap['story_bg'].path;
            config.story.bgPublicId = filesMap['story_bg'].filename;
            config.story.bgType = 'image';
        }

        // Handle Custom Sections file uploads (pattern: custom_img_<id>, custom_bg_<id>)
        if (Array.isArray(config.customSections)) {
            config.customSections = config.customSections.map(sec => {
                const imgKey = `custom_img_${sec.id}`;
                const bgKey = `custom_bg_${sec.id}`;

                let updatedSec = { ...sec.toObject?.() || sec };

                if (filesMap[imgKey]) {
                    updatedSec.imageUrl = filesMap[imgKey].path;
                    updatedSec.imagePublicId = filesMap[imgKey].filename;
                }

                if (filesMap[bgKey]) {
                    updatedSec.bgImage = filesMap[bgKey].path;
                    updatedSec.bgPublicId = filesMap[bgKey].filename;
                    updatedSec.bgType = 'image';
                }

                return updatedSec;
            });
        }

        const updatedConfig = await config.save();

        res.json({
            success: true,
            message: 'About page configuration updated successfully',
            data: updatedConfig
        });
    } catch (error) {
        next(error);
    }
};
