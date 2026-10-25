const crypto = require('crypto');
const Sale = require('../models/Sale');
const Party = require('../models/Party');
const { getFinancialYear } = require('../utils/financialYear');
const { cloudinary } = require('../config/cloudinary');

const num = v => parseFloat(v) || 0;
const r2 = v => Math.round((v + Number.EPSILON) * 100) / 100;
const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Checks the shared secret sent by the invoice generator (header: x-api-key).
// Runs BEFORE the upload middleware so a wrong key never uploads anything.
exports.requireInvoiceKey = (req, res, next) => {
  const key = process.env.INVOICE_SYNC_KEY;
  if (!key || !process.env.INVOICE_SYNC_USER_ID) {
    return res.status(503).json({ success: false, message: 'Invoice sync is not configured on the server.' });
  }
  const given = Buffer.from(String(req.get('x-api-key') || ''));
  const want = Buffer.from(key);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
    return res.status(401).json({ success: false, message: 'Invalid API key.' });
  }
  next();
};

// POST /api/integrations/invoice-sale   (multipart: data = JSON string, pdf = file)
// Creates the sale, or updates it if a sale with the same bill number already exists
// in the same financial year (so retries / re-downloads never create duplicates).
exports.syncInvoice = async (req, res) => {
  let d;
  try { d = JSON.parse(req.body.data); } catch { return res.status(400).json({ success: false, message: 'Invalid invoice data.' }); }

  const userId = process.env.INVOICE_SYNC_USER_ID;
  const billNumber = String(d.billNumber || '').trim();
  const receiverName = String(d.receiverName || '').trim();
  const items = (Array.isArray(d.items) ? d.items : []).filter(i => i && String(i.productName || '').trim());
  if (!billNumber || !receiverName || !items.length) {
    return res.status(400).json({ success: false, message: 'Invoice number, receiver name and at least one product are required.' });
  }

  let billDate = new Date(d.billDate);
  if (isNaN(billDate)) billDate = new Date();

  // ── Party: match by GSTIN, else by name; create if new ──
  const gst = String(d.receiverGST || '').trim().toUpperCase();
  let party = null;
  if (gst) party = await Party.findOne({ createdBy: userId, gstNumber: gst });
  if (!party) party = await Party.findOne({ createdBy: userId, name: { $regex: `^${escapeRegex(receiverName)}$`, $options: 'i' } });
  if (!party) {
    party = await Party.create({ name: receiverName, address: d.receiverAddress || '', gstNumber: gst, type: 'customer', createdBy: userId });
  } else if (party.type === 'supplier') {
    party.type = 'both';
    await party.save();
  }

  // ── Amounts (taken from the invoice so ScrapTrade matches the PDF exactly) ──
  const lineItems = items.map((it, i) => {
    const weight = num(it.quantity);
    const ratePerKg = num(it.rate);
    return {
      srNo: i + 1,
      materialType: String(it.productName).trim(),
      weight, weightUnit: 'kg', ratePerKg,
      taxableAmount: r2(num(it.amount) || weight * ratePerKg),
    };
  });
  const taxable = r2(lineItems.reduce((s, l) => s + l.taxableAmount, 0));
  const totalQty = r2(lineItems.reduce((s, l) => s + l.weight, 0));
  const gstPercent = num(d.gstPercent) || 18;
  const totalGstAmount = d.gstAmount != null ? r2(num(d.gstAmount)) : r2((taxable * gstPercent) / 100);
  const totalAmount = num(d.grandTotal) || Math.round(taxable + totalGstAmount);
  const half = r2(totalGstAmount / 2);

  const fields = {
    billNumber,
    invoiceNumber: billNumber,
    invoiceGenerated: true,
    party: party._id,
    materialType: lineItems[0].materialType + (lineItems.length > 1 ? ` +${lineItems.length - 1} more` : ''),
    weight: totalQty, weightUnit: 'kg',
    ratePerKg: totalQty ? r2(taxable / totalQty) : 0,
    lineItems,
    taxableAmount: taxable,
    gstType: 'CGST_SGST', gstPercent,
    cgstAmount: half, sgstAmount: half, igstAmount: 0,
    totalGstAmount,
    roundOff: r2(num(d.roundOff)),
    totalAmount,
    billDate,
    financialYear: getFinancialYear(billDate),
  };

  // invoice numbers restart every financial year, so identify a sale by number + FY
  let sale = await Sale.findOne({ createdBy: userId, billNumber, financialYear: fields.financialYear });
  let created = false;

  if (sale) {
    // update: keep existing payments and notes
    if (req.file) {
      if (sale.pdfPublicId) await cloudinary.uploader.destroy(sale.pdfPublicId, { resource_type: 'raw' }).catch(() => {});
      fields.pdfUrl = req.file.path;
      fields.pdfPublicId = req.file.filename;
    }
    Object.assign(sale, fields);
    await sale.save();
  } else {
    created = true;
    const vehicle = String(d.vehicleNo || '').trim();
    sale = await Sale.create({
      ...fields,
      pdfUrl: req.file?.path || '',
      pdfPublicId: req.file?.filename || '',
      notes: vehicle ? `Vehicle No: ${vehicle}` : '',
      createdBy: userId,
    });
  }

  res.status(created ? 201 : 200).json({ success: true, created, saleId: sale._id });
};
