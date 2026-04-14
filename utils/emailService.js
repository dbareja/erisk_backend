const nodemailer = require("nodemailer");

// Debug: Log email config (without password)
console.log("📧 Email Config:", {
  user: process.env.EMAIL_USER,
  passSet: !!process.env.EMAIL_PASS,
  frontendUrl: process.env.FRONTEND_URL,
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email Transporter Error:", error.message);
  } else {
    console.log("✅ Email Transporter Ready");
  }
});

const sendSubAdminInviteEmail = async (email, setPasswordLink, name) => {
  try {
    const fullLink = `${process.env.FRONTEND_URL}${setPasswordLink}`;
    console.log(`📧 Sending invite email to: ${email}`);
    const result = await transporter.sendMail({
    from: `"EzRisk Management" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Set Your Password - EzRisk Management Sub-Admin Invite",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#4f46e5;">Welcome to EzRisk Management!</h2>
        <p>Hello ${name || "Sub-Admin"},</p>
        <p>You have been invited as a <strong>Sub-Admin</strong> on the EzRisk Management platform.</p>
        <p><strong>Your Role:</strong> Sub-Admin — you can access only the modules assigned to you by your Super Admin.</p>
        <p>To get started, please set your password by clicking the button below:</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${fullLink}" style="background-color:#4f46e5;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;display:inline-block;">
            Set Your Password
          </a>
        </div>
        <p>Or copy and paste this link:</p>
        <p style="background-color:#f3f4f6;padding:10px;border-radius:4px;word-break:break-all;">${fullLink}</p>
        <p><strong>Note:</strong> This link will expire in 7 days.</p>
        <hr style="margin:30px 0;border:none;border-top:1px solid #e0e0e0;">
        <p style="font-size:12px;color:#6b7280;">If you did not expect this invitation, please ignore this email.</p>
      </div>
    `,
    });
    console.log(`✅ Invite email sent: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`❌ Invite email failed:`, error.message);
    throw error;
  }
};

// Email to OSA Super Admin when new company/individual registers
const sendOSARegistrationNotification = async (companyName, companyEmail, accountType, adminLoginUrl) => {
  try {
    console.log(`📧 Sending OSA notification for: ${companyName}`);
    const result = await transporter.sendMail({
      from: `"EzRisk Management" <${process.env.EMAIL_USER}>`,
      to: [process.env.OSA_ADMIN_EMAIL, "harshdeep.kaur@opensecurityalliance.org"].join(","),
      subject: `New ${accountType === "individual" ? "Individual" : "Company"} Registration Request - ${companyName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
          <h2 style="color:#e11d48;">New Registration Request</h2>
          <p>A new <strong>${accountType === "individual" ? "individual" : "company"}</strong> has submitted a registration request:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;width:40%;">Name</td><td style="padding:8px;">${companyName}</td></tr>
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Email</td><td style="padding:8px;">${companyEmail}</td></tr>
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Type</td><td style="padding:8px;">${accountType === "individual" ? "Individual" : "Company"}</td></tr>
          </table>
          <p>Please login to the admin portal to review and approve this request:</p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${adminLoginUrl}" style="background-color:#e11d48;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;display:inline-block;">
              Login to Admin Portal
            </a>
          </div>
          <p style="font-size:12px;color:#6b7280;">EzRisk Management Platform</p>
        </div>
      `,
    });
    console.log(`✅ OSA notification sent: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`❌ OSA notification failed:`, error.message);
    throw error;
  }
};

// Email to company/individual when approved
const sendApprovalEmail = async (toEmail, companyName, slug, accountType) => {
  try {
    const loginUrl = `${process.env.FRONTEND_URL}/${slug}/login`;
    console.log(`📧 Sending approval email to: ${toEmail}, login: ${loginUrl}`);
    const result = await transporter.sendMail({
    from: `"EzRisk Management" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Your ${accountType === "individual" ? "Account" : "Company"} Has Been Approved - EzRisk Management`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#16a34a;">🎉 Congratulations! Your ${accountType === "individual" ? "Account" : "Company"} is Approved!</h2>
        <p>Hello,</p>
        <p>Your ${accountType === "individual" ? "individual account" : "company"} <strong>${companyName}</strong> has been approved by the OSA Super Admin.</p>
        <p>You can now login to your GRC platform using your dedicated URL:</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${loginUrl}" style="background-color:#16a34a;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;display:inline-block;">
            Login Now: /${slug}/login
          </a>
        </div>
        <p><strong>Your Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
        <hr style="margin:20px 0;border:none;border-top:1px solid #e0e0e0;">
        <p><strong>As Super Admin, you can:</strong></p>
        <ul>
          <li>Create and manage Sub-Admins for your ${accountType === "individual" ? "account" : "company"}</li>
          <li>Assign specific modules to each Sub-Admin</li>
          <li>Manage all GRC data — Assets, Risks, Controls, Treatments</li>
        </ul>
        <p style="font-size:12px;color:#6b7280;">EzRisk Management Platform</p>
      </div>
    `,
    });
    console.log(`✅ Approval email sent: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`❌ Approval email failed:`, error.message);
    throw error;
  }
};

module.exports = {
  sendSubAdminInviteEmail,
  sendOSARegistrationNotification,
  sendApprovalEmail,
};
