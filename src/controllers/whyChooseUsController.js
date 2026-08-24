const WhyChooseUs = require('../models/WhyChooseUs');
const { cloudinary } = require('../config/cloudinary');
const createError = require('http-errors');

const DEFAULT_CONFIG = {
    tag: 'ROOTED IN TRADITION',
    mainHeading: 'WHY CHOOSE US',
    heading: 'Crafted by Nature.',
    subheading: 'Powered by ACI.',
    description: 'ACI me hum ancient Ayurvedic wisdom ko modern science ke saath combine karke aise products banate hain jo aapke body ko naturally nourish kare. Har ingredient carefully source kiya jata hai, ethically process hota hai, aur proper testing ke baad hi use hota hai — taaki aapko mile pure, natural aur trusted wellness.',
    points: [
        {
            title: '✔ 100% Natural',
            description: 'No artificial additives or preservatives.'
        },
        {
            title: '✔ Ethically Sourced',
            description: 'Direct partnerships with trusted farmers.'
        },
        {
            title: '✔ Lab Tested',
            description: 'Strict quality control for every batch.'
        }
    ],
    imageUrl: '/certifiedIcons/whychooseus.png',
    publicId: '',
    isActive: true
};

// @desc    Get Why Choose Us configuration (Public)
// @route   GET /api/why-choose-us
exports.getWhyChooseUs = async (req, res, next) => {
    try {
        let config = await WhyChooseUs.findOne({});
        if (!config) {
            config = await WhyChooseUs.create(DEFAULT_CONFIG);
        }

        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update Why Choose Us configuration (Admin only)
// @route   PUT /api/why-choose-us
exports.updateWhyChooseUs = async (req, res, next) => {
    try {
        let config = await WhyChooseUs.findOne({});
        if (!config) {
            config = new WhyChooseUs(DEFAULT_CONFIG);
        }

        const { tag, mainHeading, heading, subheading, description, isActive } = req.body;

        if (tag !== undefined) config.tag = tag;
        if (mainHeading !== undefined) config.mainHeading = mainHeading;
        if (heading !== undefined) config.heading = heading;
        if (subheading !== undefined) config.subheading = subheading;
        if (description !== undefined) config.description = description;
        if (isActive !== undefined) config.isActive = typeof isActive === 'string' ? isActive === 'true' : Boolean(isActive);

        if (req.body.points) {
            try {
                const parsedPoints = typeof req.body.points === 'string' 
                    ? JSON.parse(req.body.points) 
                    : req.body.points;
                if (Array.isArray(parsedPoints)) {
                    config.points = parsedPoints;
                }
            } catch (err) {
                console.warn('Could not parse points JSON:', err);
            }
        }

        // Handle image upload
        if (req.file) {
            // Delete old Cloudinary image if it exists
            if (config.publicId) {
                try {
                    await cloudinary.uploader.destroy(config.publicId);
                } catch (cErr) {
                    console.error('Failed to remove old Cloudinary image:', cErr);
                }
            }

            config.imageUrl = req.file.path;
            config.publicId = req.file.filename;
        } else if (req.body.imageUrl && !req.file) {
            config.imageUrl = req.body.imageUrl;
            if (req.body.resetPublicId) {
                config.publicId = '';
            }
        }

        const updatedConfig = await config.save();

        res.json({
            success: true,
            message: 'Why Choose Us section updated successfully',
            data: updatedConfig
        });
    } catch (error) {
        next(error);
    }
};
