const nodemailer = require("nodemailer");

// Create transporter using Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send sub-admin invite email
const sendSubAdminInviteEmail = async (email, setPasswordLink, name) => {
  const fullLink = `${process.env.FRONTEND_URL}${setPasswordLink}`;
  
  const mailOptions = {
    from: `"EzRisk Management" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Set Your Password - EzRisk Management Sub-Admin Invite",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Welcome to EzRisk Management!</h2>
        <p>Hello ${name || "Sub-Admin"},</p>
        <p>You have been invited as a <strong>Sub-Admin</strong> on the EzRisk Management platform.</p>
        <p>To get started, please set your password by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${fullLink}" style="background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Set Your Password
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">
          ${fullLink}
        </p>
        <p><strong>Note:</strong> This link will expire in 7 days.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
        <p style="font-size: 12px; color: #6b7280;">
          If you did not expect this invitation, please ignore this email.
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendSubAdminInviteEmail,
};
