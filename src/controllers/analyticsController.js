const analyticsService = require('../services/analytics.service');

exports.getAdminAnalytics = async (req, res, next) => {
    try {
        // 1. Frontend se timeFilter query parameter receive karein
        const { timeFilter } = req.query;

        const [stats, revenueChart] = await Promise.all([
            // 2. timeFilter ko service functions mein pass karein
            analyticsService.getOverallStats(timeFilter), 
            analyticsService.getRevenueByMonth(timeFilter),
        ]);

        res.json({
            success: true,
            data: { stats, revenueChart },
        });
    } catch (error) {
        next(error);
    }
};