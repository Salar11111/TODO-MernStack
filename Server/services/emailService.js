const nodemailer = require('nodemailer');

// Lazily-created transporter. Falls back to a console log in development
// when SMTP credentials are not configured.
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Dev fallback: stream emails to console
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
  }

  return transporter;
}

async function sendEmail({ to, subject, html }) {
  const t = getTransporter();
  const from = process.env.EMAIL_FROM || 'noreply@taskmaster.app';

  const info = await t.sendMail({
    from,
    to,
    subject,
    html,
  });

  // In development, log the rendered email so the link is visible
  if (process.env.NODE_ENV !== 'production') {
    if (info.message) {
      console.log('--- Email preview ---');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(info.message.toString());
      console.log('--- End email ---');
    }
  }

  return info;
}

module.exports = { sendEmail };
