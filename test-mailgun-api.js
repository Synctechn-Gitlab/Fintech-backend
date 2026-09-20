require('dotenv').config();
const { sendVerificationEmail } = require('./src/utils/emailService');

process.env.MAILGUN_API_KEY = process.env.SMTP_PASSWORD;
process.env.MAILGUN_DOMAIN = 'sandbox1f07edde778a423986fe588a8cbdd9d50.mailgun.org';
process.env.MAILGUN_FROM = 'Hidel Finance <hidelfinance@sandbox1f07edde778a423986fe588a8cbdd9d50.mailgun.org>';

async function run() {
  try {
    await sendVerificationEmail('hydelfinance0012@gmail.com', 'Test User', '123456');
    console.log('SUCCESS');
  } catch (err) {
    console.error('FAILED', err);
  }
}

run();
