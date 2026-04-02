// This middleware checks if an admin user has been approved by the owner.
const checkAdminAccess = (req, res, next) => {
    // This should be used AFTER the 'protect' middleware.
    // It assumes req.user is populated.
    if (req.user && (req.user.isAdminApproved || req.user.role === 'owner')) {
        next();
    } else {
        res.status(403).json({ 
            success: false, 
            message: "Forbidden: Admin access not approved." 
        });
    }
};

module.exports = { checkAdminAccess };