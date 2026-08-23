const Article = require('../models/Article');
const { cloudinary } = require('../config/cloudinary');
const createError = require('http-errors');

// Helper to generate URL-friendly slug
const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')        // Replace spaces with -
        .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
        .replace(/\-\-+/g, '-')      // Replace multiple - with single -
        .replace(/^-+/, '')          // Trim - from start of text
        .replace(/-+$/, '');         // Trim - from end of text
};

// @desc    Get all articles (Public: Published only | Admin: All)
// @route   GET /api/articles
exports.getArticles = async (req, res, next) => {
    try {
        const isAdmin = req.query.admin === 'true';
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
        const search = req.query.search ? req.query.search.trim() : '';
        const category = req.query.category ? req.query.category.trim() : '';

        const filter = isAdmin ? {} : { status: 'Published' };

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }

        if (category && category !== 'All') {
            filter.category = category;
        }

        const total = await Article.countDocuments(filter);
        const articles = await Article.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({
            success: true,
            data: articles,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single article by slug
// @route   GET /api/articles/:slug
exports.getArticleBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const article = await Article.findOneAndUpdate(
            { slug: slug.toLowerCase() },
            { $inc: { views: 1 } },
            { new: true }
        );

        if (!article) {
            throw createError(404, 'Article not found');
        }

        res.json({
            success: true,
            data: article
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new article (Admin only)
// @route   POST /api/articles
exports.createArticle = async (req, res, next) => {
    try {
        let { 
            title, 
            slug, 
            breadcrumbTitle, 
            description, 
            content, 
            author, 
            category, 
            tags, 
            status, 
            faqs 
        } = req.body;

        if (!title || !description || !content) {
            throw createError(400, 'Title, description, and content are required.');
        }

        // Image validation
        if (!req.file) {
            throw createError(400, 'Featured image is required.');
        }

        // Auto-generate or sanitize slug
        let finalSlug = slug ? slugify(slug) : slugify(title);
        if (!finalSlug) {
            finalSlug = `article-${Date.now()}`;
        }

        // Ensure slug uniqueness
        let existing = await Article.findOne({ slug: finalSlug });
        if (existing) {
            finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
        }

        // Parse FAQs if passed as JSON string
        let parsedFaqs = [];
        if (faqs) {
            try {
                parsedFaqs = typeof faqs === 'string' ? JSON.parse(faqs) : faqs;
            } catch (e) {
                parsedFaqs = [];
            }
        }

        // Parse Tags
        let parsedTags = [];
        if (tags) {
            if (Array.isArray(tags)) {
                parsedTags = tags;
            } else if (typeof tags === 'string') {
                try {
                    parsedTags = JSON.parse(tags);
                } catch (e) {
                    parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
                }
            }
        }

        const article = await Article.create({
            title,
            slug: finalSlug,
            breadcrumbTitle: breadcrumbTitle || title,
            description,
            content,
            image: req.file.path,
            imagePublicId: req.file.filename,
            author: author || 'ACI Ayurveda',
            category: category || 'Ayurvedic Wellness',
            tags: parsedTags,
            status: status || 'Published',
            faqs: parsedFaqs
        });

        res.status(201).json({
            success: true,
            message: 'Article created successfully.',
            data: article
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update article (Admin only)
// @route   PUT /api/articles/:id
exports.updateArticle = async (req, res, next) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) {
            throw createError(404, 'Article not found');
        }

        let { 
            title, 
            slug, 
            breadcrumbTitle, 
            description, 
            content, 
            author, 
            category, 
            tags, 
            status, 
            faqs 
        } = req.body;

        if (title) article.title = title;
        if (breadcrumbTitle !== undefined) article.breadcrumbTitle = breadcrumbTitle || article.title;
        if (description) article.description = description;
        if (content) article.content = content;
        if (author) article.author = author;
        if (category) article.category = category;
        if (status) article.status = status;

        if (slug) {
            const sanitizedSlug = slugify(slug);
            if (sanitizedSlug && sanitizedSlug !== article.slug) {
                const existing = await Article.findOne({ slug: sanitizedSlug, _id: { $ne: article._id } });
                if (existing) {
                    throw createError(400, 'An article with this slug already exists.');
                }
                article.slug = sanitizedSlug;
            }
        }

        if (faqs !== undefined) {
            try {
                article.faqs = typeof faqs === 'string' ? JSON.parse(faqs) : faqs;
            } catch (e) {
                // keep existing if parse error
            }
        }

        if (tags !== undefined) {
            if (Array.isArray(tags)) {
                article.tags = tags;
            } else if (typeof tags === 'string') {
                try {
                    article.tags = JSON.parse(tags);
                } catch (e) {
                    article.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
                }
            }
        }

        // If new featured image uploaded
        if (req.file) {
            if (article.imagePublicId) {
                try {
                    await cloudinary.uploader.destroy(article.imagePublicId);
                } catch (cErr) {
                    console.warn('Cloudinary delete old article image error:', cErr.message);
                }
            }
            article.image = req.file.path;
            article.imagePublicId = req.file.filename;
        }

        const updatedArticle = await article.save();

        res.json({
            success: true,
            message: 'Article updated successfully.',
            data: updatedArticle
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete article (Admin only)
// @route   DELETE /api/articles/:id
exports.deleteArticle = async (req, res, next) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) {
            throw createError(404, 'Article not found');
        }

        if (article.imagePublicId) {
            try {
                await cloudinary.uploader.destroy(article.imagePublicId);
            } catch (cErr) {
                console.warn('Cloudinary delete article image error:', cErr.message);
            }
        }

        await article.deleteOne();

        res.json({
            success: true,
            message: 'Article deleted successfully.'
        });
    } catch (error) {
        next(error);
    }
};
