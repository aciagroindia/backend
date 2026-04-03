const express = require('express');
const dns = require('node:dns');

// Override DNS to fix MongoDB Atlas SRV resolution issues
dns.setServers(['8.8.8.8', '1.1.1.1']);

const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const bannerRoutes = require('./src/routes/bannerRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const productRoutes = require('./src/routes/productRoutes');
const wishlistRoutes = require("./src/routes/wishlistRoutes");
const cartRoutes = require("./src/routes/cart.routes");
const orderRoutes = require("./src/routes/orderRoutes");
const bulkOrderRoutes = require("./src/routes/bulkOrderRoutes");
const reviewRoutes = require("./src/routes/reviewRoutes");
const recentlyViewedRoutes = require("./src/routes/recentlyViewedRoutes");
const adminRequestRoutes = require("./src/routes/adminRequestRoutes");
const adminAuthRoutes = require("./src/routes/adminAuthRoutes");
const adminDirectRoutes = require("./src/routes/adminDirectRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const adminOrderRoutes = require("./src/routes/adminOrderRoutes");
const settingsRoutes = require("./src/routes/settingsRoutes");
const analyticsRoutes = require("./src/routes/analyticsRoutes");
const discountRoutes = require("./src/routes/discountRoutes");
const couponRoutes = require("./src/routes/couponRoutes");
const inquiryRoutes = require("./src/routes/inquiryRoutes");
const adminInquiryRoutes = require("./src/routes/adminInquiryRoutes"); // New import
const certificateRoutes = require("./src/routes/certificateRoutes");
const aboutMediaRoutes = require("./src/routes/aboutMediaRoutes");
const adminUserRoutes = require("./src/routes/adminUserRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");








// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();
const morgan = require('morgan');

// Standard Middlewares
app.use(morgan('dev'));
app.use(express.json()); // Allows us to parse JSON in requests

// Optimized CORS configuration for frontend
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://aciagro.com'
  ],
  credentials: true, // Allow cookies/authorization headers to be sent
};
app.use(cors(corsOptions));
app.use(helmet());       // Adds security headers to protect your app


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/bulk-orders", bulkOrderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/recently-viewed", recentlyViewedRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/about-media", aboutMediaRoutes);

// --- Admin Routes ---
// Note: More specific routes must be declared before less specific ones.
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/settings", settingsRoutes);
app.use("/api/admin/analytics", analyticsRoutes);
app.use("/api/admin/dashboard", dashboardRoutes); // Corrected from /api/dashboard
app.use("/api/admin/discounts", discountRoutes);
app.use("/api/admin/coupons", couponRoutes);
app.use("/api/admin/inquiries", adminInquiryRoutes); // Mount new admin inquiry routes
app.use("/api/admin/notifications", notificationRoutes);
app.use("/api/admin", adminRequestRoutes); // This should be last for /api/admin

// This route is for frontend inconsistencies, handles non-/api prefixed admin routes
app.use("/admin", adminDirectRoutes);

// Test Route
app.get('/', (req, res) => {
  res.send('API is running successfully...');
});

// Error Handling Middleware
// This should be the last middleware.
app.use((err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message;

  // Mongoose validation error (e.g., required fields missing)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    if (err.errors) {
      message = Object.values(err.errors).map(val => val.message).join(', ');
    }
  }

  // Joi validation error
  if (err.isJoi) {
    statusCode = 400;
    message = err.details.map(d => d.message).join(', ');
    console.error("🚩 Joi Validation Error:", message);
  }

  // Mongoose duplicate key error (e.g., for unique slug)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0] || 'field';
    message = `An account with this ${field} already exists. Please use a different one.`;
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});