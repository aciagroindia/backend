const jwt = require('jsonwebtoken');

// Ek alag secret ka istemal karein, jo .env file mein ho
const APPROVAL_SECRET = process.env.JWT_APPROVAL_SECRET;
const APPROVAL_EXPIRES_IN = '24h'; // Token 24 ghante mein expire ho jayega

if (!APPROVAL_SECRET) {
    console.error('FATAL ERROR: JWT_APPROVAL_SECRET is not defined in .env file.');
    process.exit(1);
}

exports.generateApprovalToken = (requestId) => {
    return jwt.sign({ id: requestId }, APPROVAL_SECRET, { expiresIn: APPROVAL_EXPIRES_IN });
};

exports.verifyApprovalToken = (token) => {
    try {
        return jwt.verify(token, APPROVAL_SECRET);
    } catch (error) {
        return null; // Agar token invalid ya expired hai
    }
};