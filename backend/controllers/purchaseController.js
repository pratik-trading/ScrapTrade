const Purchase = require('../models/Purchase');
const { getFinancialYear } = require('../utils/financialYear');
const { cloudinary } = require('../config/cloudinary');

// Central calculator — called on create AND update
const calcTotals = ({ taxableAmount, gstType, gstPercent, tcsApplicable, tcsPercent, otherCharges }) => {
  const taxable = parseFloat(taxableAmount) || 0;
  const gstPct  = parseFloat(gstPercent) || 0;
  const tcsPct  = parseFloat(tcsPercent) || 0;
  const others  = parseFloat(otherCharges) || 0;

  const gstAmt = gstType === 'none' ? 0 : parseFloat(((taxable * gstPct) / 100).toFixed(2));
  const half   = parseFloat((gstAmt / 2).toFixed(2));
  const cgst   = gstType === 'CGST_SGST' ? half : 0;
  const sgst   = gstType === 'CGST_SGST' ? half : 0;
  const igst   = gstType === 'IGST'      ? gstAmt : 0;

  // TCS base = taxableAmount only (CBDT Circular 17/2020 — excludes GST)
  const tcsAmt   = tcsApplicable ? parseFloat(((taxable * tcsPct) / 100).toFixed(2)) : 0;

  // Final: taxable + GST + TCS + otherCharges
  const preRound = taxable + gstAmt + tcsAmt + others;
  const total    = Math.round(preRound);
  const roundOff = parseFloat((total - preRound).toFixed(2));

  return { cgstAmount: cgst, sgstAmount: sgst, igstAmount: igst, totalGstAmount: gstAmt, tcsAmount: tcsAmt, roundOff, totalAmount: total };
};

const toBool = v => v === true || v === 'true';

exports.getPurchases = async (req, res) => {
  const { financialYear, party, status, search, startDate, endDate, page = 1, limit = 50 } = req.query;
  const query = { createdBy: req.user._id };
  if (financialYear) query.financialYear = financialYear;
  if (party) query.party = party;
  if (search) query.billNumber = { $regex: search, $options: 'i' };
  if (startDate || endDate) {
    query.billDate = {};
    if (startDate) query.billDate.$gte = new Date(startDate);
    if (endDate)   query.billDate.$lte = new Date(endDate);
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [purchases, total] = await Promise.all([
    Purchase.find(query).populate('party', 'name mobile').sort({ billDate: -1 }).skip(skip).limit(parseInt(limit)),
    Purchase.countDocuments(query),
  ]);
  let filtered = purchases;
  if (status) filtered = purchases.filter(p => (p.isOverdue ? 'Overdue' : p.paymentStatus) === status);
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
    tcsApplicable, tcsPercent,
    otherCharges, otherChargesLabel,
    billDate, dueDate, notes,
    lineItems: lineItemsRaw,
  } = req.body;

  const financialYear = getFinancialYear(billDate || new Date());
  const pdfUrl        = req.file?.path     || '';
  const pdfPublicId   = req.file?.filename || '';

  let lineItems = [];
  if (lineItemsRaw) { try { lineItems = JSON.parse(lineItemsRaw); } catch { lineItems = []; } }

  const tcs    = toBool(tcsApplicable);
  const totals = calcTotals({ taxableAmount, gstType, gstPercent, tcsApplicable: tcs, tcsPercent, otherCharges });

  const purchase = await Purchase.create({
    billNumber, party, materialType, weight, weightUnit, ratePerKg,
    taxableAmount, gstType, gstPercent,
    tcsApplicable: tcs, tcsPercent,
    otherCharges: otherCharges || 0, otherChargesLabel,
    ...totals,
    lineItems, billDate, dueDate, financialYear,
    pdfUrl, pdfPublicId, notes,
    createdBy: req.user._id,
  });
  const populated = await purchase.populate('party', 'name mobile');
  res.status(201).json({ success: true, purchase: populated });
};

exports.updatePurchase = async (req, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found.' });

  const { billDate, lineItems: lineItemsRaw, tcsApplicable, taxableAmount, gstType, gstPercent, tcsPercent, otherCharges } = req.body;
  if (billDate) req.body.financialYear = getFinancialYear(billDate);
  if (lineItemsRaw) { try { req.body.lineItems = JSON.parse(lineItemsRaw); } catch { delete req.body.lineItems; } }

  const tcs    = tcsApplicable !== undefined ? toBool(tcsApplicable) : purchase.tcsApplicable;
  const totals = calcTotals({
    taxableAmount:  taxableAmount  !== undefined ? taxableAmount  : purchase.taxableAmount,
    gstType:        gstType        !== undefined ? gstType        : purchase.gstType,
    gstPercent:     gstPercent     !== undefined ? gstPercent     : purchase.gstPercent,
    tcsApplicable:  tcs,
    tcsPercent:     tcsPercent     !== undefined ? tcsPercent     : purchase.tcsPercent,
    otherCharges:   otherCharges   !== undefined ? otherCharges   : purchase.otherCharges,
  });
  Object.assign(req.body, totals, { tcsApplicable: tcs });

  if (req.file) {
    if (purchase.pdfPublicId) await cloudinary.uploader.destroy(purchase.pdfPublicId, { resource_type: 'raw' }).catch(() => {});
    req.body.pdfUrl      = req.file.path;
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
  if (purchase.pdfPublicId) await cloudinary.uploader.destroy(purchase.pdfPublicId, { resource_type: 'raw' }).catch(() => {});
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