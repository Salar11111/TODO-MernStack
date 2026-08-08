const crypto = require('crypto');
const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/user');
const { sendEmail } = require('../services/emailService');

// @desc    Request a password reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  // Always return 200 to prevent user enumeration
  if (!user) {
    return res.json({ message: 'If that email exists, a reset link has been sent.' });
  }

  // Generate a token (hashed in DB, plaintext sent to user)
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
  await user.save({ validateBeforeSave: false });

  // Build the reset URL from the client origin
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

  const message = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Task Master — Password Reset</h2>
      <p>You requested a password reset. Click the button below to set a new password:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}"
           style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        Or paste this link into your browser:<br>
        <a href="${resetUrl}">${resetUrl}</a>
      </p>
      <p style="color: #666; font-size: 14px;">
        This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Task Master — Password Reset',
      html: message,
    });
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    // Roll back the token if email failed
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500);
    throw new Error('Email could not be sent');
  }
});

// @desc    Reset password using a token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    res.status(400);
    throw new Error('Token and new password are required');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select('+password');

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }

  // Set the new password (the pre-save hook will hash it)
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  // Invalidate any existing refresh token
  user.refreshToken = undefined;
  await user.save();

  res.json({ message: 'Password reset successfully. Please log in.' });
});

module.exports = { forgotPassword, resetPassword };
