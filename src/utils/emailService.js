const sendVerificationEmail = async (email, name, otp) => {
  console.log('\n=============================================');
  console.log(`[EMAIL SERVICE] Sending Verification Email to ${email}`);
  console.log('=============================================\n');

  const apiKey = (process.env.MAILGUN_API_KEY || '').trim();
  const domain = (process.env.MAILGUN_DOMAIN || '').trim() || 'sandbox1f07edde778a423986fe588a8cbd9d50.mailgun.org';
  const from = (process.env.MAILGUN_FROM || '').trim() || `Hidel Finance <hidelfinance@${domain}>`;

  console.log('[EMAIL SERVICE] Provider: Mailgun HTTP API');
  console.log(`[EMAIL SERVICE] Domain: ${domain}`);
  console.log(`[EMAIL SERVICE] Recipient: ${email}`);
  console.log(`[EMAIL SERVICE] API key present: ${!!apiKey}`);

  if (!apiKey) {
    console.log('[EMAIL SERVICE] Missing MAILGUN_API_KEY. Skipping actual email send.');
    return true; // For testing when credentials aren't set
  }

  const htmlContent = `
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
    `;

  const url = `https://api.mailgun.net/v3/${domain}/messages`;
  
  const params = new URLSearchParams();
  params.append('from', from);
  params.append('to', email);
  params.append('subject', 'Verify your Hidel Finance Account');
  params.append('html', htmlContent);

  try {
    const authHeader = 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    console.log(`[EMAIL SERVICE] Mailgun response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      // Ensure we don't accidentally log the full request headers which might contain auth
      throw new Error(`Mailgun API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("[EMAIL SERVICE] Email sent successfully via Mailgun HTTP API. Message ID:", data.id);
    return data.id;
  } catch (error) {
    console.error("[EMAIL SERVICE] Mailgun API error:", error.message);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

module.exports = {
  sendVerificationEmail
};
