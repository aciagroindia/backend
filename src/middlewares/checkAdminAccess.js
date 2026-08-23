// This middleware checks if an admin user has valid admin access.
const checkAdminAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Not authorized, user not found' 
        });
    }

    const role = (req.user.role || '').toLowerCase();
    if (role === 'admin' || role === 'owner' || req.user.isAdminApproved) {
        return next();
    }

    return res.status(403).json({ 
        success: false, 
        message: "Forbidden: Admin access not approved." 
    });
};

module.exports = { checkAdminAccess };