const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;

  // 1. Cookie
  if (req.cookies?.token) {
    token = req.cookies.token;
  }
  // 2. Authorization header
  else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 3. Query param (for CSV export direct links)
  else if (req.query?.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found.' });
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};