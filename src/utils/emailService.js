const nodemailer = require('nodemailer');

const sendVerificationEmail = async (email, name, otp) => {
  console.log('\n=============================================');
  console.log(`[EMAIL SERVICE] Sending Verification Email to ${email}`);
  console.log('=============================================\n');

  const senderEmail = process.env.GMAIL_USER;
  const senderPass = process.env.GMAIL_PASS;

  console.log('[EMAIL SERVICE] email provider: Gmail');
  console.log('[EMAIL SERVICE] SMTP host: smtp.gmail.com');
  console.log('[EMAIL SERVICE] SMTP port: 587');
  console.log(`[EMAIL SERVICE] Gmail username: ${senderEmail}`);
  console.log(`[EMAIL SERVICE] GMAIL_PASS_PRESENT: ${!!senderPass}`);

  if (!senderEmail || !senderPass) {
    console.log('[EMAIL SERVICE] Missing GMAIL_USER or GMAIL_PASS. Skipping actual email send via Nodemailer.');
    return true; // For testing when credentials aren't set
  }

  // Configure Nodemailer for Gmail over port 587 with STARTTLS
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: senderEmail,
      pass: senderPass
    }
  });

  try {
    await transporter.verify();
    console.log('[EMAIL SERVICE] transporter.verify() succeeded. Ready to send.');
  } catch (verifyError) {
    console.error('[EMAIL SERVICE] transporter.verify() failed:', verifyError.message);
  }

  const mailOptions = {
    from: `"Hidel Finance" <${senderEmail}>`,
    to: email,
    subject: 'Verify your Hidel Finance Account',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #111827;">Welcome to Hidel Finance!</h2>
        <p style="color: #4B5563; font-size: 16px;">
          Hello ${name},
        </p>
        <p style="color: #14bc25ff; font-size: 16px;">
          Your email verification OTP is:
        </p>
        <div style="margin: 30px 0; text-align: center;">
          <div style="background-color: #F3F4F6; display: inline-block; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 32px; letter-spacing: 4px; color: #111827;">
            ${otp}
          </div>
        </div>
        <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
          This OTP will expire in 10 minutes.
        </p>
        <p style="color: #6B7280; font-size: 14px; margin-top: 10px;">
          If you did not create this account, please ignore this email.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[EMAIL SERVICE] Email sent successfully via Gmail. Message ID:", info.messageId);
    return info.messageId;
  } catch (error) {
    console.error("[EMAIL SERVICE] Nodemailer error:", error);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

module.exports = {
  sendVerificationEmail
};
