const Party = require('../models/Party');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');

exports.getParties = async (req, res) => {
  const { type, search } = req.query;
  const query = { createdBy: req.user._id };
  if (type) query.type = { $in: [type, 'both'] };
  if (search) query.name = { $regex: search, $options: 'i' };
  const parties = await Party.find(query).sort({ name: 1 });
  res.json({ success: true, parties });
};

exports.createParty = async (req, res) => {
  const { name, mobile, address, gstNumber, type } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Party name is required.' });
  const party = await Party.create({ name, mobile, address, gstNumber, type, createdBy: req.user._id });
  res.status(201).json({ success: true, party });
};

exports.updateParty = async (req, res) => {
  const party = await Party.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!party) return res.status(404).json({ success: false, message: 'Party not found.' });
  res.json({ success: true, party });
};

exports.deleteParty = async (req, res) => {
  const party = await Party.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!party) return res.status(404).json({ success: false, message: 'Party not found.' });
  // Check if party has transactions
  const purchaseCount = await Purchase.countDocuments({ party: party._id });
  const saleCount = await Sale.countDocuments({ party: party._id });
  if (purchaseCount + saleCount > 0) {
    return res.status(400).json({ success: false, message: 'Cannot delete party with existing transactions.' });
  }
  await party.deleteOne();
  res.json({ success: true, message: 'Party deleted.' });
};

exports.getPartyLedger = async (req, res) => {
  const { id } = req.params;
  const { financialYear } = req.query;
  const query = { party: id, createdBy: req.user._id };
  if (financialYear) query.financialYear = financialYear;

  const party = await Party.findOne({ _id: id, createdBy: req.user._id });
  if (!party) return res.status(404).json({ success: false, message: 'Party not found.' });

  const purchases = await Purchase.find(query).sort({ billDate: -1 });
  const sales = await Sale.find(query).sort({ billDate: -1 });

  const totalPurchase = purchases.reduce((s, p) => s + p.totalAmount, 0);
  const totalSale = sales.reduce((s, p) => s + p.totalAmount, 0);
  const totalPurchasePaid = purchases.reduce((s, p) => s + p.paidAmount, 0);
  const totalSalePaid = sales.reduce((s, p) => s + p.paidAmount, 0);

  res.json({
    success: true,
    party,
    purchases,
    sales,
    summary: {
      totalPurchase,
      totalSale,
      pendingPayable: totalPurchase - totalPurchasePaid,
      pendingReceivable: totalSale - totalSalePaid,
    },
  });
};
