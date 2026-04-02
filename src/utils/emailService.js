const nodemailer = require('nodemailer');
const { generateApprovalToken } = require('./approvalToken');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

exports.sendApprovalEmail = async (adminName, adminEmail, requestId) => {
    // Raw ID ki jagah ek secure, short-lived token generate karein
    const token = generateApprovalToken(requestId);

    // Links mein ab token ka istemal hoga
    const approveLink = `${process.env.BASE_URL}/api/admin/email-approve/${token}`;
    const rejectLink = `${process.env.BASE_URL}/api/admin/email-reject/${token}`;

    const mailOptions = {
        from: `"ACI Agro Admin System" <${process.env.EMAIL_USER}>`,
        to: process.env.OWNER_EMAIL,
        subject: "New Admin Access Request",
        html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
                <h2>Naya Admin Request!</h2>
                <p><strong>Name:</strong> ${adminName}</p>
                <p><strong>Email:</strong> ${adminEmail}</p>
                <hr />
                <p>Kripya niche diye gaye buttons se action lein:</p>
                <a href="${approveLink}" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">APPROVE</a>
                <a href="${rejectLink}" style="background: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">REJECT</a>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
};