const express = require('express');
const router = express.Router();
const cookieParser = require('cookie-parser');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../validation/authValidation');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiters');
const { registerUser, loginUser, getMe, refreshToken, logoutUser } = require('../controllers/authControllers');
const { forgotPassword, resetPassword } = require('../controllers/passwordResetController');

// Parse cookies for refresh token
router.use(cookieParser());

router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), authLimiter, loginUser);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logoutUser);
router.get('/me', protect, getMe);
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);

module.exports = router;
