const User = require('../models/User');
const { sendTokenCookie } = require('../utils/jwt');

exports.register = async (req, res) => {
  const { name, email, password, businessName } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
  }
  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Email already registered.' });
  }
  const user = await User.create({ name, email, password, businessName });
  sendTokenCookie(res, user._id);
  res.status(201).json({
    success: true,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role, businessName: user.businessName },
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }
  sendTokenCookie(res, user._id);
  res.json({
    success: true,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role, businessName: user.businessName },
  });
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully.' });
};

exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};
