const mongoose = require('mongoose');
const paymentSchema = require('./Payment');

const lineItemSchema = new mongoose.Schema({
  srNo:          { type: Number },
  materialType:  { type: String, required: true },
  weight:        { type: Number, required: true },
  weightUnit:    { type: String, default: 'kg' },
  ratePerKg:     { type: Number, required: true },
  taxableAmount: { type: Number, required: true },
}, { _id: false });

const saleSchema = new mongoose.Schema({
  billNumber:       { type: String, required: true, trim: true },
  invoiceNumber:    { type: String, default: '' },
  invoiceGenerated: { type: Boolean, default: false },

  party:        { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },

  // Primary fields — kept for backward compat and simple queries
  materialType: { type: String, required: true, trim: true },
  weight:       { type: Number, required: true, min: 0 },
  weightUnit:   { type: String, enum: ['kg', 'ton', 'quintal'], default: 'kg' },
  ratePerKg:    { type: Number, required: true, min: 0 },

  // All line items (for multi-product bills)
  lineItems: { type: [lineItemSchema], default: [] },

  taxableAmount:  { type: Number, required: true, min: 0 },
  gstType:        { type: String, enum: ['none', 'IGST', 'CGST_SGST'], default: 'CGST_SGST' },
  gstPercent:     { type: Number, default: 18 },
  cgstAmount:     { type: Number, default: 0 },
  sgstAmount:     { type: Number, default: 0 },
  igstAmount:     { type: Number, default: 0 },
  totalGstAmount: { type: Number, default: 0 },
  roundOff:       { type: Number, default: 0 },
  totalAmount:    { type: Number, required: true, min: 0 },

  billDate:      { type: Date, required: true },
  dueDate:       { type: Date },
  financialYear: { type: String, required: true },

  pdfUrl:             { type: String, default: '' },
  pdfPublicId:        { type: String, default: '' },
  invoicePdfUrl:      { type: String, default: '' },
  invoicePdfPublicId: { type: String, default: '' },

  payments:  [paymentSchema],
  notes:     { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

saleSchema.virtual('paidAmount').get(function () {
  return this.payments.reduce((sum, p) => sum + p.amount, 0);
});
saleSchema.virtual('pendingAmount').get(function () {
  return this.totalAmount - this.paidAmount;
});
saleSchema.virtual('paymentStatus').get(function () {
  const paid = this.paidAmount;
  if (paid >= this.totalAmount) return 'Paid';
  if (paid > 0) return 'Partial';
  return 'Pending';
});
saleSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  return this.dueDate < new Date() && this.pendingAmount > 0;
});

saleSchema.set('toJSON', { virtuals: true });
saleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Sale', saleSchema);