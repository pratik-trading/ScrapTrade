const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mobile: { type: String, trim: true, default: '' },
  address: { type: String, default: '' },
  gstNumber: { type: String, default: '', uppercase: true },
  type: { type: String, enum: ['supplier', 'customer', 'both'], default: 'both' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Party', partySchema);
