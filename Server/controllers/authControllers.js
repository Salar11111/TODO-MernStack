const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/user');

const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

// Convert an env duration string ("15m", "7d") to milliseconds.
const toMs = (duration) => {
  const match = String(duration).trim().match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 0;
  const units = { s: 1, m: 60, h: 3600, d: 86400 };
  return Number(match[1]) * units[match[2]] * 1000;
};

// Generate a signed JWT access token for the given user id
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Generate a signed refresh token
const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// Build the sanitized user object returned to the client
const buildAuthResponse = (user) => ({
  token: generateToken(user._id),
  user: { _id: user._id, name: user.name, email: user.email },
});

// Set refresh token as an HTTP-only cookie
const setRefreshCookie = (res, refreshToken) => {
  // Fall back to 7 days if REFRESH_TOKEN_EXPIRES_IN is malformed/missing
  const maxAge = toMs(REFRESH_TOKEN_EXPIRES_IN) || 7 * 24 * 60 * 60 * 1000;
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path: '/api/auth',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(409);
    throw new Error('User already exists');
  }

  let user;
  try {
    user = await User.create({ name, email, password });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      throw new Error('User already exists');
    }
    throw error;
  }

  // Generate and store refresh token
  const refreshToken = generateRefreshToken();
  await User.findByIdAndUpdate(user._id, { refreshToken });

  setRefreshCookie(res, refreshToken);

  res.status(201).json(buildAuthResponse(user));
});

// @desc    Login a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Generate and store refresh token
  const refreshToken = generateRefreshToken();
  await User.findByIdAndUpdate(user._id, { refreshToken });

  setRefreshCookie(res, refreshToken);

  res.json(buildAuthResponse(user));
});

// @desc    Get the currently logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = req.user;
  res.json({ _id: user._id, name: user.name, email: user.email });
});

// @desc    Refresh the access token using the refresh cookie
// @route   POST /api/auth/refresh
// @access  Public (uses refresh cookie)
const refreshToken = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies?.refreshToken;

  if (!incomingToken) {
    res.status(401);
    throw new Error('No refresh token provided');
  }

  // Find user with this refresh token
  const user = await User.findOne({ refreshToken: incomingToken }).select('+refreshToken');
  if (!user) {
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.status(401);
    throw new Error('Invalid refresh token');
  }

  // Generate new access token
  const newAccessToken = generateToken(user._id);

  // Rotate the refresh token for security
  const newRefreshToken = generateRefreshToken();
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  setRefreshCookie(res, newRefreshToken);

  res.json({ token: newAccessToken });
});

// @desc    Logout a user (clear refresh cookie)
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
  // Clear the stored refresh token from the user
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });

  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ message: 'Logged out successfully' });
});

module.exports = { registerUser, loginUser, getMe, refreshToken, logoutUser };
