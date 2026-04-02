const AdminRequest = require("../models/AdminRequest");
const User = require("../models/User");
const createError = require("http-errors");
const { sendApprovalEmail } = require("../utils/emailService");
const { verifyApprovalToken } = require("../utils/approvalToken");

// 1. REQUEST ADMIN ACCESS (Mail trigger karega)
exports.requestAdminAccess = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        
        const exists = await AdminRequest.findOne({ user: user._id, status: "pending" });
        if (exists) throw createError(400, "Request already pending.");

        const request = await AdminRequest.create({ user: user._id });

        // Owner ko mail bhej rahe hain
        await sendApprovalEmail(user.name, user.email, request._id);

        res.json({ success: true, message: "Request sent. Check email for approval." });
    } catch (error) {
        next(error);
    }
};

// 2. EMAIL APPROVE (GET Request via Link)
exports.approveAdminViaEmail = async (req, res, next) => {
    try {
        // URL se token ko verify karein
        const decoded = verifyApprovalToken(req.params.token);
        if (!decoded) {
            return res.status(400).send("<h1>Approval link invalid hai ya expire ho chuka hai.</h1>");
        }

        const request = await AdminRequest.findById(decoded.id);
        if (!request || request.status !== 'pending') {
            return res.send("<h1>Link expire ho chuka hai ya request pehle hi process ho chuki hai.</h1>");
        }

        request.status = "approved";
        await Promise.all([
            User.findByIdAndUpdate(request.user, { role: "admin", isAdminApproved: true }),
            request.save()
        ]);

        res.send("<h1>Mubarak ho! Admin Approve ho gaya hai.</h1>");
    } catch (error) {
        res.send("<h1>Kuch galti hui. Kripya manual check karein.</h1>");
    }
};

// 3. EMAIL REJECT
exports.rejectAdminViaEmail = async (req, res, next) => {
    try {
        // URL se token ko verify karein
        const decoded = verifyApprovalToken(req.params.token);
        if (!decoded) {
            return res.status(400).send("<h1>Rejection link invalid hai ya expire ho chuka hai.</h1>");
        }

        await AdminRequest.findByIdAndUpdate(decoded.id, { status: "rejected" });
        res.send("<h1>Admin Request Reject kar di gayi hai.</h1>");
    } catch (error) {
        res.send("<h1>Error in rejection.</h1>");
    }
};