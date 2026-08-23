const Policy = require('../models/Policy');
const createError = require('http-errors');

// Default initial templates for standard policies
const defaultPolicies = {
    'privacy-policy': {
        title: 'Privacy Policy',
        content: `
            <p>Welcome to <strong>ACI Agro Solutions</strong>. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about our policy or our practices regarding your personal information, please contact us.</p>
            
            <h2>1. INFORMATION WE COLLECT</h2>
            <p>We collect personal information that you voluntarily provide to us when registering on the website, expressing an interest in obtaining information about us or our products, when participating in activities on the website, or otherwise contacting us.</p>
            <p>The personal information that we collect depends on the context of your interactions with us, the choices you make, and the products and features you use. The personal information we collect may include names, phone numbers, email addresses, mailing addresses, billing addresses, and contact preferences.</p>

            <h2>2. HOW WE USE YOUR INFORMATION</h2>
            <p>We use personal information collected via our website for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.</p>
            <ul>
                <li>To facilitate account creation and logon process.</li>
                <li>To fulfill and manage your orders, payments, and returns.</li>
                <li>To send administrative information, order updates, and marketing communications.</li>
                <li>To protect our Services and prevent fraud.</li>
            </ul>

            <h2>3. SHARING OF YOUR INFORMATION</h2>
            <p>We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations such as delivery partnerships and payment gateway processing.</p>

            <h2>4. DATA SECURITY</h2>
            <p>We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure.</p>
        `
    },
    'cancellation-policy': {
        title: 'Cancellation & Refund Policy',
        content: `
            <p>At <strong>ACI Agro Solutions</strong>, we value our customers and strive to provide pure, premium ayurvedic and herbal products. Please read our cancellation and refund guidelines carefully.</p>

            <h2>1. ORDER CANCELLATION</h2>
            <p>You can cancel your order before it has been dispatched from our warehouse. To cancel an order, navigate to your <strong>Orders</strong> section or contact our customer support team immediately with your Order ID.</p>
            <p>Once an order has been shipped, it cannot be cancelled directly. In such cases, you may refuse delivery or request a return upon receiving the package subject to our return terms.</p>

            <h2>2. DAMAGED OR INCORRECT PRODUCTS</h2>
            <p>If you receive a package that is damaged, defective, or contains the wrong product, please notify us within <strong>48 hours</strong> of delivery along with photographic or video proof of the outer box and the product.</p>

            <h2>3. REFUND PROCESS</h2>
            <p>Once your returned item or cancellation request is approved:</p>
            <ul>
                <li><strong>Prepaid Orders:</strong> The refund will be credited back to your original payment method (Credit/Debit Card, UPI, Net Banking) within 5-7 business days.</li>
                <li><strong>Cash on Delivery (COD) Orders:</strong> Refunds will be processed via direct Bank Transfer / UPI upon receiving your bank details.</li>
            </ul>

            <h2>4. NON-RETURNABLE ITEMS</h2>
            <p>Due to hygiene and healthcare safety standards, opened bottles, consumed supplements, or products with broken seals cannot be returned unless verified to be defective.</p>
        `
    },
    'shipping-policy': {
        title: 'Shipping & Delivery Policy',
        content: `
            <p>We are dedicated to delivering your orders safely, securely, and in a timely manner across India.</p>

            <h2>1. PROCESSING TIME</h2>
            <p>All orders are processed within <strong>24 to 48 business hours</strong> after payment confirmation (excluding Sundays and national holidays). You will receive an SMS and email notification with your tracking number once your order is dispatched.</p>

            <h2>2. DELIVERY TIMELINES</h2>
            <p>Standard delivery timelines across various locations are as follows:</p>
            <ul>
                <li><strong>Metro Cities:</strong> 2 to 4 business days.</li>
                <li><strong>Tier 2 & Tier 3 Cities:</strong> 3 to 6 business days.</li>
                <li><strong>Remote Locations & Northeast:</strong> 5 to 8 business days.</li>
            </ul>

            <h2>3. SHIPPING CHARGES</h2>
            <p>We offer <strong>Free Standard Shipping</strong> on prepaid orders and qualified cart thresholds. Nominal shipping or cash handling fees may apply for standard Cash on Delivery (COD) orders as shown during checkout.</p>

            <h2>4. ORDER TRACKING</h2>
            <p>You can track your live shipment status anytime using the tracking link provided via SMS/Email or directly from the <strong>Orders</strong> section on our website.</p>
        `
    },
    'terms-of-service': {
        title: 'Terms of Service',
        content: `
            <p>Welcome to <strong>ACI Agro Solutions</strong>. By accessing or using our website, services, and purchasing our products, you agree to be bound by the following terms and conditions.</p>

            <h2>1. GENERAL CONDITIONS</h2>
            <p>We reserve the right to refuse service to anyone for any legitimate reason at any time. You understand that your content (not including credit card information) may be transferred unencrypted over various networks.</p>

            <h2>2. PRODUCTS AND PRICING</h2>
            <p>Prices for our products are subject to change without prior notice. We reserve the right at any time to modify or discontinue the Service (or any part or content thereof) without notice at any time.</p>
            <p>We make every effort to display the colors, features, specifications, and details of the products available on the site as accurately as possible.</p>

            <h2>3. ACCURACY OF BILLING AND ACCOUNT INFORMATION</h2>
            <p>You agree to provide current, complete, and accurate purchase and account information for all purchases made at our store. You agree to promptly update your account and other information, including your email address and payment details, so that we can complete your transactions and contact you as needed.</p>

            <h2>4. GOVERNING LAW</h2>
            <p>These Terms of Service and any separate agreements whereby we provide you Services shall be governed by and construed in accordance with the laws of India.</p>
        `
    }
};

// @desc    Get all policies
// @route   GET /api/policies
exports.getPolicies = async (req, res, next) => {
    try {
        const dbPolicies = await Policy.find({}).lean();
        
        // Merge with defaults to ensure all 4 standard policies always exist
        const result = Object.keys(defaultPolicies).map(slug => {
            const found = dbPolicies.find(p => p.slug === slug);
            if (found) return found;
            return {
                slug,
                title: defaultPolicies[slug].title,
                content: defaultPolicies[slug].content,
                createdAt: new Date(),
                updatedAt: new Date()
            };
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single policy by slug
// @route   GET /api/policies/:slug
exports.getPolicyBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const normalizedSlug = slug.toLowerCase().trim();

        let policy = await Policy.findOne({ slug: normalizedSlug });

        if (!policy && defaultPolicies[normalizedSlug]) {
            policy = {
                slug: normalizedSlug,
                title: defaultPolicies[normalizedSlug].title,
                content: defaultPolicies[normalizedSlug].content,
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }

        if (!policy) {
            throw createError(404, 'Policy not found');
        }

        res.json({
            success: true,
            data: policy
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create or update policy (Admin only)
// @route   PUT /api/policies/:slug
exports.updatePolicy = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const { title, content } = req.body;

        if (!content || !content.trim()) {
            throw createError(400, 'Policy content is required.');
        }

        const normalizedSlug = slug.toLowerCase().trim();
        const policyTitle = title?.trim() || defaultPolicies[normalizedSlug]?.title || normalizedSlug.replace('-', ' ').toUpperCase();

        const updatedPolicy = await Policy.findOneAndUpdate(
            { slug: normalizedSlug },
            {
                slug: normalizedSlug,
                title: policyTitle,
                content: content,
                updatedBy: req.user?.name || 'Admin'
            },
            { upsert: true, new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: `${policyTitle} updated successfully.`,
            data: updatedPolicy
        });
    } catch (error) {
        next(error);
    }
};
