const Sale = require('../models/Sale');
const { getFinancialYear } = require('../utils/financialYear');
const { cloudinary } = require('../config/cloudinary');

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

exports.getSales = async (req, res) => {
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
  const [sales, total] = await Promise.all([
    Sale.find(query).populate('party', 'name mobile').sort({ billDate: -1 }).skip(skip).limit(parseInt(limit)),
    Sale.countDocuments(query),
  ]);

  let filtered = sales;
  if (status) {
    filtered = sales.filter(s => {
      const st = s.isOverdue ? 'Overdue' : s.paymentStatus;
      return st === status;
    });
  }

  res.json({ success: true, sales: filtered, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
};

exports.getSale = async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, createdBy: req.user._id }).populate('party');
  if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });
  res.json({ success: true, sale });
};

exports.createSale = async (req, res) => {
  const {
    billNumber, party, materialType, weight, weightUnit, ratePerKg,
    taxableAmount, gstType, gstPercent,
    billDate, dueDate, notes, linkedPurchaseId
  } = req.body;

  const financialYear = getFinancialYear(billDate || new Date());
  const gst = calcGST(taxableAmount, gstType, gstPercent);
  const pdfUrl = req.file?.path || '';
  const pdfPublicId = req.file?.filename || '';

  const sale = await Sale.create({
    billNumber, party, materialType,
    weight: parseFloat(weight),
    weightUnit,
    ratePerKg: parseFloat(ratePerKg),
    taxableAmount: parseFloat(taxableAmount),
    gstType: gstType || 'none',
    gstPercent: parseFloat(gstPercent) || 0,
    ...gst,
    billDate, dueDate, financialYear,
    pdfUrl, pdfPublicId, notes, linkedPurchaseId,
    createdBy: req.user._id,
  });

  const populated = await sale.populate('party', 'name mobile');
  res.status(201).json({ success: true, sale: populated });
};

exports.updateSale = async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });

  const { billDate, taxableAmount, gstType, gstPercent } = req.body;
  if (billDate) req.body.financialYear = getFinancialYear(billDate);

  if (taxableAmount || gstType || gstPercent) {
    const gst = calcGST(
      taxableAmount || sale.taxableAmount,
      gstType !== undefined ? gstType : sale.gstType,
      gstPercent !== undefined ? gstPercent : sale.gstPercent
    );
    Object.assign(req.body, gst);
  }

  if (req.file) {
    if (sale.pdfPublicId) {
      await cloudinary.uploader.destroy(sale.pdfPublicId, { resource_type: 'raw' }).catch(() => {});
    }
    req.body.pdfUrl = req.file.path;
    req.body.pdfPublicId = req.file.filename;
  }

  Object.assign(sale, req.body);
  await sale.save();
  const populated = await sale.populate('party', 'name mobile');
  res.json({ success: true, sale: populated });
};

exports.deleteSale = async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });
  if (sale.pdfPublicId) {
    await cloudinary.uploader.destroy(sale.pdfPublicId, { resource_type: 'raw' }).catch(() => {});
  }
  await sale.deleteOne();
  res.json({ success: true, message: 'Sale deleted.' });
};

exports.addPayment = async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });
  const { amount, paymentDate, mode, note, reference } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount required.' });
  sale.payments.push({ amount, paymentDate, mode, note, reference });
  await sale.save();
  res.json({ success: true, sale });
};

exports.deletePayment = async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });
  sale.payments = sale.payments.filter(p => p._id.toString() !== req.params.paymentId);
  await sale.save();
  res.json({ success: true, sale });
};