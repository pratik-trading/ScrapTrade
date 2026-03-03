const Sale = require('../models/Sale');
const { getFinancialYear } = require('../utils/financialYear');
const { cloudinary } = require('../config/cloudinary');

const calcGST = (taxable, gstType, gstPercent) => {
  const pct = parseFloat(gstPercent) || 0;
  const total = parseFloat(taxable) || 0;
  const gstAmt = parseFloat(((total * pct) / 100).toFixed(2));
  const half = parseFloat((gstAmt / 2).toFixed(2));
  return {
    cgstAmount:     gstType === 'CGST_SGST' ? half : 0,
    sgstAmount:     gstType === 'CGST_SGST' ? half : 0,
    igstAmount:     gstType === 'IGST' ? gstAmt : 0,
    totalGstAmount: gstType === 'none' ? 0 : gstAmt,
    totalAmount:    gstType === 'none' ? total : Math.round(total + gstAmt),
  };
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
    billDate, dueDate, notes,
    taxableAmount, gstType, gstPercent,
    lineItems: lineItemsRaw,
  } = req.body;

  const financialYear = getFinancialYear(billDate || new Date());
  const pdfUrl = req.file?.path || '';
  const pdfPublicId = req.file?.filename || '';

  let lineItems = [];
  if (lineItemsRaw) {
    try { lineItems = JSON.parse(lineItemsRaw); } catch { lineItems = []; }
  }

  const gst = calcGST(taxableAmount, gstType, gstPercent);

  const sale = await Sale.create({
    billNumber, party, materialType, weight, weightUnit, ratePerKg,
    taxableAmount, gstType, gstPercent,
    cgstAmount: gst.cgstAmount,
    sgstAmount: gst.sgstAmount,
    igstAmount: gst.igstAmount,
    totalGstAmount: gst.totalGstAmount,
    totalAmount: gst.totalAmount,
    lineItems,
    billDate, dueDate, financialYear,
    pdfUrl, pdfPublicId, notes,
    createdBy: req.user._id,
  });

  const populated = await sale.populate('party', 'name mobile');
  res.status(201).json({ success: true, sale: populated });
};

exports.updateSale = async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });

  const { billDate, taxableAmount, gstType, gstPercent, lineItems: lineItemsRaw } = req.body;
  if (billDate) req.body.financialYear = getFinancialYear(billDate);

  if (taxableAmount || gstType || gstPercent) {
    const gst = calcGST(
      taxableAmount || sale.taxableAmount,
      gstType || sale.gstType,
      gstPercent || sale.gstPercent
    );
    Object.assign(req.body, gst);
  }

  if (lineItemsRaw) {
    try { req.body.lineItems = JSON.parse(lineItemsRaw); } catch { delete req.body.lineItems; }
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
  sale.payments.push(req.body);
  await sale.save();
  const populated = await sale.populate('party', 'name mobile');
  res.json({ success: true, sale: populated });
};

exports.deletePayment = async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });
  sale.payments = sale.payments.filter(p => p._id.toString() !== req.params.paymentId);
  await sale.save();
  const populated = await sale.populate('party', 'name mobile');
  res.json({ success: true, sale: populated });
};