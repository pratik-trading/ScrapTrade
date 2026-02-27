const Lot = require('../models/Lot');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const { getFinancialYear } = require('../utils/financialYear');

// GET all lots
exports.getLots = async (req, res) => {
  const { financialYear, status, materialType } = req.query;
  const query = { createdBy: req.user._id };
  if (financialYear) query.financialYear = financialYear;
  if (materialType) query.materialType = { $regex: materialType, $options: 'i' };

  const lots = await Lot.find(query)
    .populate({
      path: 'purchases.purchase',
      populate: { path: 'party', select: 'name mobile' }
    })
    .populate({
      path: 'sales.sale',
      populate: { path: 'party', select: 'name mobile' }
    })
    .sort({ createdAt: -1 });

  let filtered = lots;
  if (status) filtered = lots.filter(l => l.status === status);

  res.json({ success: true, lots: filtered });
};

// GET single lot
exports.getLot = async (req, res) => {
  const lot = await Lot.findOne({ _id: req.params.id, createdBy: req.user._id })
    .populate({
      path: 'purchases.purchase',
      populate: { path: 'party', select: 'name mobile' }
    })
    .populate({
      path: 'sales.sale',
      populate: { path: 'party', select: 'name mobile' }
    });

  if (!lot) return res.status(404).json({ success: false, message: 'Lot not found.' });
  res.json({ success: true, lot });
};

// CREATE lot
exports.createLot = async (req, res) => {
  const { lotNumber, materialType, description, purchases, sales } = req.body;
  if (!lotNumber || !materialType) {
    return res.status(400).json({ success: false, message: 'Lot number and material type are required.' });
  }

  let financialYear;
  if (purchases && purchases.length > 0) {
    const firstPurchase = await Purchase.findById(purchases[0].purchase);
    financialYear = firstPurchase ? firstPurchase.financialYear : getFinancialYear();
  } else {
    financialYear = getFinancialYear();
  }

  const lot = await Lot.create({
    lotNumber, materialType, description, financialYear,
    purchases: purchases || [],
    sales: sales || [],
    createdBy: req.user._id,
  });

  const populated = await Lot.findById(lot._id)
    .populate({ path: 'purchases.purchase', populate: { path: 'party', select: 'name mobile' } })
    .populate({ path: 'sales.sale', populate: { path: 'party', select: 'name mobile' } });

  res.status(201).json({ success: true, lot: populated });
};

// UPDATE lot
exports.updateLot = async (req, res) => {
  const lot = await Lot.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!lot) return res.status(404).json({ success: false, message: 'Lot not found.' });

  const { lotNumber, materialType, description, purchases, sales } = req.body;
  if (lotNumber) lot.lotNumber = lotNumber;
  if (materialType) lot.materialType = materialType;
  if (description !== undefined) lot.description = description;
  if (purchases) lot.purchases = purchases;
  if (sales) lot.sales = sales;

  await lot.save();

  const populated = await Lot.findById(lot._id)
    .populate({ path: 'purchases.purchase', populate: { path: 'party', select: 'name mobile' } })
    .populate({ path: 'sales.sale', populate: { path: 'party', select: 'name mobile' } });

  res.json({ success: true, lot: populated });
};

// ADD purchase to lot
exports.addPurchase = async (req, res) => {
  const lot = await Lot.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!lot) return res.status(404).json({ success: false, message: 'Lot not found.' });

  const { purchase, weight, rate, amount } = req.body;
  if (!purchase || !weight || !rate || !amount) {
    return res.status(400).json({ success: false, message: 'purchase, weight, rate, amount are required.' });
  }

  const already = lot.purchases.find(p => p.purchase.toString() === purchase);
  if (already) return res.status(400).json({ success: false, message: 'This purchase is already in the lot.' });

  lot.purchases.push({ purchase, weight, rate, amount });
  await lot.save();

  const populated = await Lot.findById(lot._id)
    .populate({ path: 'purchases.purchase', populate: { path: 'party', select: 'name mobile' } })
    .populate({ path: 'sales.sale', populate: { path: 'party', select: 'name mobile' } });

  res.json({ success: true, lot: populated });
};

// ADD sale to lot
exports.addSale = async (req, res) => {
  const lot = await Lot.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!lot) return res.status(404).json({ success: false, message: 'Lot not found.' });

  const { sale, weight, rate, amount } = req.body;
  if (!sale || !weight || !rate || !amount) {
    return res.status(400).json({ success: false, message: 'sale, weight, rate, amount are required.' });
  }

  const already = lot.sales.find(s => s.sale.toString() === sale);
  if (already) return res.status(400).json({ success: false, message: 'This sale is already in the lot.' });

  lot.sales.push({ sale, weight, rate, amount });
  await lot.save();

  const populated = await Lot.findById(lot._id)
    .populate({ path: 'purchases.purchase', populate: { path: 'party', select: 'name mobile' } })
    .populate({ path: 'sales.sale', populate: { path: 'party', select: 'name mobile' } });

  res.json({ success: true, lot: populated });
};

// REMOVE purchase from lot
exports.removePurchase = async (req, res) => {
  const lot = await Lot.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!lot) return res.status(404).json({ success: false, message: 'Lot not found.' });
  lot.purchases = lot.purchases.filter(p => p._id.toString() !== req.params.entryId);
  await lot.save();
  res.json({ success: true, lot });
};

// REMOVE sale from lot
exports.removeSale = async (req, res) => {
  const lot = await Lot.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!lot) return res.status(404).json({ success: false, message: 'Lot not found.' });
  lot.sales = lot.sales.filter(s => s._id.toString() !== req.params.entryId);
  await lot.save();
  res.json({ success: true, lot });
};

// DELETE lot
exports.deleteLot = async (req, res) => {
  const lot = await Lot.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!lot) return res.status(404).json({ success: false, message: 'Lot not found.' });
  await lot.deleteOne();
  res.json({ success: true, message: 'Lot deleted.' });
};