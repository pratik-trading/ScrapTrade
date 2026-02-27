const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const isProduction = process.env.NODE_ENV === 'production';

  // Set cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  // Also send token in response body for cross-origin fallback
  res.status(statusCode).json({
    success: true,
    token, // frontend stores this in localStorage as fallback
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      businessName: user.businessName,
      role: user.role,
    },
  });
};

exports.register = async (req, res) => {
  const { name, email, password, businessName } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
  }
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ success: false, message: 'Email already registered.' });

  const user = await User.create({ name, email, password, businessName });
  sendToken(user, 201, res);
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }
  sendToken(user, 200, res);
};

exports.logout = async (req, res) => {
  res.cookie('token', '', { httpOnly: true, expires: new Date(0), sameSite: 'none', secure: true });
  res.json({ success: true, message: 'Logged out.' });
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
};