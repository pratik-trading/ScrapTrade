const mongoose = require('mongoose');

const lotSchema = new mongoose.Schema({
  lotNumber: { type: String, required: true, trim: true },
  materialType: { type: String, required: true, trim: true },
  financialYear: { type: String, required: true },
  description: { type: String, default: '' },

  // Linked purchases (incoming bills)
  purchases: [
    {
      purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', required: true },
      weight: { type: Number, required: true }, // weight taken from this purchase for this lot
      rate: { type: Number, required: true },
      amount: { type: Number, required: true },
    }
  ],

  // Linked sales (outgoing bills)
  sales: [
    {
      sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
      weight: { type: Number, required: true },
      rate: { type: Number, required: true },
      amount: { type: Number, required: true },
    }
  ],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Virtual: total purchase cost
lotSchema.virtual('totalPurchaseCost').get(function () {
  return this.purchases.reduce((s, p) => s + p.amount, 0);
});

// Virtual: total purchase weight
lotSchema.virtual('totalPurchaseWeight').get(function () {
  return this.purchases.reduce((s, p) => s + p.weight, 0);
});

// Virtual: total sale revenue
lotSchema.virtual('totalSaleRevenue').get(function () {
  return this.sales.reduce((s, s2) => s + s2.amount, 0);
});

// Virtual: total sale weight
lotSchema.virtual('totalSaleWeight').get(function () {
  return this.sales.reduce((s, s2) => s + s2.weight, 0);
});

// Virtual: profit
lotSchema.virtual('profit').get(function () {
  return this.totalSaleRevenue - this.totalPurchaseCost;
});

// Virtual: profit %
lotSchema.virtual('profitPercent').get(function () {
  if (!this.totalPurchaseCost) return 0;
  return ((this.profit / this.totalPurchaseCost) * 100).toFixed(2);
});

// Virtual: weight difference (sold - purchased)
lotSchema.virtual('weightDifference').get(function () {
  return this.totalSaleWeight - this.totalPurchaseWeight;
});

// Virtual: status
lotSchema.virtual('status').get(function () {
  const pW = this.totalPurchaseWeight;
  const sW = this.totalSaleWeight;
  if (sW === 0) return 'Unsold';
  if (sW < pW) return 'Partial';
  return 'Fully Sold';
});

lotSchema.set('toJSON', { virtuals: true });
lotSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Lot', lotSchema);