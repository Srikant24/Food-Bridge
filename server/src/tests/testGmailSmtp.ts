import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';
import { SmtpEmailProvider } from '../services/notifications/emailProvider';

export async function runGmailSmtpTest() {
  console.log('================================================================================');
  console.log('📧 FoodBridge Gmail SMTP Real-World Delivery Verification');
  console.log('================================================================================\n');

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM_ADDRESS || (user ? `"FoodBridge Operations" <${user}>` : undefined);

  if (!user || !pass) {
    console.log('ℹ️  SMTP_USER and SMTP_PASS are not configured in server/.env.');
    console.log('   Current state: Secure Sandbox fallback active (safe for local development).');
    console.log('   To enable live Gmail delivery:');
    console.log('   1. In your Google Account, enable 2-Step Verification.');
    console.log('   2. Generate a 16-character "App Password" (https://myaccount.google.com/apppasswords).');
    console.log('   3. Set in server/.env:');
    console.log('      SMTP_HOST=smtp.gmail.com');
    console.log('      SMTP_PORT=587');
    console.log('      SMTP_USER=your_gmail@gmail.com');
    console.log('      SMTP_PASS=your_16_char_app_password');
    console.log('\n✓ Provider module verified: SmtpEmailProvider is loaded and ready for credentials.');
    return { status: 'unconfigured', message: 'Credentials not configured' };
  }

  console.log(`Connecting to SMTP server at ${host}:${port} for user: ${user}...`);

  const provider = new SmtpEmailProvider(host, port, user, pass, from);
  const verifyResult = await provider.verifyConnection();

  if (!verifyResult.success) {
    console.error(`❌ SMTP Connection Failed: ${verifyResult.message}`);
    return { status: 'failed', message: verifyResult.message };
  }

  console.log('✓ SMTP Handshake Succeeded! Credentials verified with email server.');

  const recipient = process.env.TEST_EMAIL_RECIPIENT || user;
  console.log(`Sending live test email to: ${recipient}...`);

  const sendResult = await provider.send({
    to: recipient,
    subject: 'Welcome to FoodBridge — Registration Successful (Live SMTP Test)',
    text: `Hello,\n\nWelcome to FoodBridge!\n\nThis is a verified live transactional email delivered via Gmail SMTP.\n\nThank you,\nTeam FoodBridge`,
    html: `<h2>Welcome to FoodBridge!</h2><p>This is a verified live transactional email delivered via Gmail SMTP.</p>`,
  });

  if (sendResult.success) {
    console.log(`🎉 LIVE EMAIL DELIVERED! Message ID: ${sendResult.messageId}`);
    return { status: 'success', messageId: sendResult.messageId };
  } else {
    console.error(`❌ Email transmission error: ${sendResult.error}`);
    return { status: 'failed', error: sendResult.error };
  }
}

if (require.main === module) {
  runGmailSmtpTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal error during SMTP test:', err);
      process.exit(1);
    });
}
