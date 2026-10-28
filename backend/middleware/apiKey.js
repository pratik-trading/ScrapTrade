const crypto = require('crypto');

// Protects machine-to-machine integration routes (e.g. Invoice Generator).
// Client sends:  x-api-key: <INVOICE_SYNC_KEY>
const safeEqual = (a, b) => {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

module.exports = (req, res, next) => {
  const expected = process.env.INVOICE_SYNC_KEY;
  if (!expected) {
    return res
      .status(500)
      .json({ success: false, message: 'Integration API key not configured' });
  }
  const provided = req.header('x-api-key');
  if (!provided || !safeEqual(provided, expected)) {
    return res.status(401).json({ success: false, message: 'Invalid API key' });
  }
  next();
};