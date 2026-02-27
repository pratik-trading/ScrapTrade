const Purchase = require('../models/Purchase');
const { getFinancialYear } = require('../utils/financialYear');
const { cloudinary } = require('../config/cloudinary');

// Helper: calculate GST amounts from form data
const calcGST = (taxableAmount, gstType, gstPercent) => {
  const taxable = parseFloat(taxableAmount) || 0;
  const pct = parseFloat(gstPercent) || 0;

  if (!gstType || gstType === 'none' || pct === 0) {
    return { cgstAmount: 0, sgstAmount: 0, igstAmount: 0, totalGstAmount: 0, totalAmount: taxable };
  }

  const totalGst = parseFloat(((taxable * pct) / 100).toFixed(2));

  if (gstType === 'IGST') {
    return { cgstAmount: 0, sgstAmount: 0, igstAmount: totalGst, totalGstAmount: totalGst, totalAmount: taxable + totalGst };
  }

  if (gstType === 'CGST_SGST') {
    const half = parseFloat((totalGst / 2).toFixed(2));
    return { cgstAmount: half, sgstAmount: half, igstAmount: 0, totalGstAmount: totalGst, totalAmount: taxable + totalGst };
  }

  return { cgstAmount: 0, sgstAmount: 0, igstAmount: 0, totalGstAmount: 0, totalAmount: taxable };
};

exports.getPurchases = async (req, res) => {
  const { financialYear, party, status, search, startDate, endDate, page = 1, limit = 50 } = req.query;
  const query = { createdBy: req.user._id };
  if (financialYear) query.financialYear = financialYear;
  if (party) query.party = party;
  if (search) query.billNumber = { $regex: search, $options: 'i' };
  if (startDate || endDate) {
    query.billDate = {};
    if (startDate) query.billDate.$gte = new Date(startDate);
    if (endDate) query.billDate.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [purchases, total] = await Promise.all([
    Purchase.find(query).populate('party', 'name mobile').sort({ billDate: -1 }).skip(skip).limit(parseInt(limit)),
    Purchase.countDocuments(query),
  ]);

  let filtered = purchases;
  if (status) {
    filtered = purchases.filter(p => {
      const s = p.isOverdue ? 'Overdue' : p.paymentStatus;
      return s === status;
    });
  }

  res.json({ success: true, purchases: filtered, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
};

exports.getPurchase = async (req, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id, createdBy: req.user._id }).populate('party');
  if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found.' });
  res.json({ success: true, purchase });
};

exports.createPurchase = async (req, res) => {
  const {
    billNumber, party, materialType, weight, weightUnit, ratePerKg,
    taxableAmount, gstType, gstPercent,
    billDate, dueDate, notes
  } = req.body;

  const financialYear = getFinancialYear(billDate || new Date());
  const gst = calcGST(taxableAmount, gstType, gstPercent);
  const pdfUrl = req.file?.path || '';
  const pdfPublicId = req.file?.filename || '';

  const purchase = await Purchase.create({
    billNumber, party, materialType,
    weight: parseFloat(weight),
    weightUnit,
    ratePerKg: parseFloat(ratePerKg),
    taxableAmount: parseFloat(taxableAmount),
    gstType: gstType || 'none',
    gstPercent: parseFloat(gstPercent) || 0,
    ...gst,
    billDate, dueDate, financialYear,
    pdfUrl, pdfPublicId, notes,
    createdBy: req.user._id,
  });

  const populated = await purchase.populate('party', 'name mobile');
  res.status(201).json({ success: true, purchase: populated });
};

exports.updatePurchase = async (req, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found.' });

  const { billDate, taxableAmount, gstType, gstPercent } = req.body;
  if (billDate) req.body.financialYear = getFinancialYear(billDate);

  // Recalculate GST if any GST field changed
  if (taxableAmount || gstType || gstPercent) {
    const gst = calcGST(
      taxableAmount || purchase.taxableAmount,
      gstType !== undefined ? gstType : purchase.gstType,
      gstPercent !== undefined ? gstPercent : purchase.gstPercent
    );
    Object.assign(req.body, gst);
  }

  if (req.file) {
    if (purchase.pdfPublicId) {
      await cloudinary.uploader.destroy(purchase.pdfPublicId, { resource_type: 'raw' }).catch(() => {});
    }
    req.body.pdfUrl = req.file.path;
    req.body.pdfPublicId = req.file.filename;
  }

  Object.assign(purchase, req.body);
  await purchase.save();
  const populated = await purchase.populate('party', 'name mobile');
  res.json({ success: true, purchase: populated });
};

exports.deletePurchase = async (req, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found.' });
  if (purchase.pdfPublicId) {
    await cloudinary.uploader.destroy(purchase.pdfPublicId, { resource_type: 'raw' }).catch(() => {});
  }
  await purchase.deleteOne();
  res.json({ success: true, message: 'Purchase deleted.' });
};

exports.addPayment = async (req, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found.' });
  const { amount, paymentDate, mode, note, reference } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount required.' });
  purchase.payments.push({ amount, paymentDate, mode, note, reference });
  await purchase.save();
  res.json({ success: true, purchase });
};

exports.deletePayment = async (req, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found.' });
  purchase.payments = purchase.payments.filter(p => p._id.toString() !== req.params.paymentId);
  await purchase.save();
  res.json({ success: true, purchase });
};