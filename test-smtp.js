const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSMTP() {
  console.log('Testing Mailgun SMTP Credentials...');
  console.log(`Host: ${process.env.SMTP_HOST}`);
  console.log(`Port: ${process.env.SMTP_PORT}`);
  console.log(`User: ${process.env.SMTP_USER}`);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });

  try {
    await transporter.verify();
    console.log('\n✅ SUCCESS: SMTP Credentials are correct and verified!');
  } catch (error) {
    console.error('\n❌ FAILED: Authentication Error');
    console.error(error.message);
  }
}

testSMTP();
