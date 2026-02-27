const mongoose = require('mongoose');
const paymentSchema = require('./Payment');

const purchaseSchema = new mongoose.Schema({
  billNumber: { type: String, required: true, trim: true },
  party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  materialType: { type: String, required: true, trim: true },
  weight: { type: Number, required: true, min: 0 },
  weightUnit: { type: String, enum: ['kg', 'ton', 'quintal'], default: 'kg' },
  ratePerKg: { type: Number, required: true, min: 0 },

  // GST Fields
  taxableAmount: { type: Number, required: true, min: 0 }, // weight * rate (before GST)
  gstType: { type: String, enum: ['none', 'IGST', 'CGST_SGST'], default: 'none' },
  gstPercent: { type: Number, default: 0 },   // e.g. 18 for 18%
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  totalGstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true, min: 0 }, // taxableAmount + totalGstAmount

  billDate: { type: Date, required: true },
  dueDate: { type: Date },
  financialYear: { type: String, required: true },
  pdfUrl: { type: String, default: '' },
  pdfPublicId: { type: String, default: '' },
  payments: [paymentSchema],
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

purchaseSchema.virtual('paidAmount').get(function () {
  return this.payments.reduce((sum, p) => sum + p.amount, 0);
});
purchaseSchema.virtual('pendingAmount').get(function () {
  return this.totalAmount - this.paidAmount;
});
purchaseSchema.virtual('paymentStatus').get(function () {
  const paid = this.paidAmount;
  if (paid >= this.totalAmount) return 'Paid';
  if (paid > 0) return 'Partial';
  return 'Pending';
});
purchaseSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  return this.dueDate < new Date() && this.pendingAmount > 0;
});

purchaseSchema.set('toJSON', { virtuals: true });
purchaseSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Purchase', purchaseSchema);