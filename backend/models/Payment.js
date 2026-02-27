const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  paymentDate: { type: Date, required: true, default: Date.now },
  mode: { type: String, enum: ['Cash', 'Bank', 'UPI', 'Cheque'], default: 'Cash' },
  note: { type: String, default: '' },
  reference: { type: String, default: '' },
}, { timestamps: true });

module.exports = paymentSchema;
