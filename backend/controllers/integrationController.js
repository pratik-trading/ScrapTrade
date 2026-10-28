const cloudinary = require('cloudinary').v2;
const Party = require('../models/Party');
const Sale = require('../models/Sale');
const User = require('../models/User');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FY_REGEX = /^\d{4}-\d{4}$/;

// GET /api/integrations/parties
exports.getParties = async (req, res, next) => {
  try {
    // Invoices go to customers, so skip pure suppliers
    const parties = await Party.find({ type: { $in: ['customer', 'both'] } })
      .select('name address gstNumber -_id')
      .sort({ name: 1 })
      .lean();

    const data = parties.map((p) => ({
      name: p.name || '',
      address: p.address || '',
      gst: p.gstNumber || '',
    }));

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// GET /api/integrations/last-invoice-no?fy=2026-2027
// Invoices are outgoing bills, so this reads from Sales.
exports.getLastInvoiceNo = async (req, res, next) => {
  try {
    const { fy } = req.query;

    if (!fy || !FY_REGEX.test(fy)) {
      return res.status(400).json({
        success: false,
        message: 'Query param "fy" is required in the format YYYY-YYYY (e.g. 2026-2027)',
      });
    }

    const [start, end] = fy.split('-').map(Number);
    if (end !== start + 1) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid financial year' });
    }

    // Every sale in this FY (deleted sales are already gone). Both the generated
    // invoiceNumber and the manual billNumber count, so numbers never repeat.
    const sales = await Sale.find({ financialYear: fy })
      .select('invoiceNumber billNumber -_id')
      .lean();

    // Strip the financial year (2026-2027, 2026-27, 26-27, with - or /)
    // and keep only the serial number, e.g. "INV/26-27/012" -> "012"
    const s4 = String(start);
    const e4 = String(end);
    const fyPattern = new RegExp(
      `(?:${s4}|${s4.slice(2)})\\s*[-/]\\s*(?:${e4}|${e4.slice(2)})`,
      'g'
    );

    let maxN = 0;
    let width = 0;
    for (const s of sales) {
      for (const value of [s.invoiceNumber, s.billNumber]) {
        if (!value) continue;
        const digits = String(value).replace(fyPattern, ' ').match(/\d+/g);
        if (!digits) continue;
        const serial = digits[digits.length - 1];
        const n = parseInt(serial, 10);
        if (n > maxN) {
          maxN = n;
          width = serial.length;
        }
      }
    }

    // Highest existing number + 1 (keeps zero padding: "012" -> "013"); 1 if none yet
    const nextNo = String(maxN + 1).padStart(width, '0');

    res.json({ billNumber: nextNo });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/integrations/invoice-sale   (multipart: "data" JSON string + "pdf" file)
// Called by the invoice generator after an invoice PDF is made.
// Idempotent: the same invoice number in the same FY is saved only once.
// ---------------------------------------------------------------------------
const fyOf = (iso) => {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return m >= 4 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

const uploadPdf = (buffer, publicId) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'scrap-trade/invoices',
        public_id: publicId,
        resource_type: 'raw',
        overwrite: true,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

exports.createInvoiceSale = async (req, res, next) => {
  try {
    let data;
    try {
      data = JSON.parse(req.body.data || '{}');
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid "data" JSON' });
    }

    const invoiceNo = String(data.billNumber || '').trim();
    const receiverName = String(data.receiverName || '').trim();
    const items = Array.isArray(data.items) ? data.items : [];

    if (!invoiceNo || !receiverName || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'billNumber, receiverName and at least one item are required',
      });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.billDate || ''))) {
      return res.status(400).json({ success: false, message: 'billDate must be YYYY-MM-DD' });
    }

    const financialYear = fyOf(data.billDate);

    // De-duplicate (the invoice app retries until it gets a success response)
    if (!req.file) {
      console.warn(`[invoice-sale] invoice ${invoiceNo}: no "pdf" file received`);
    }

    const existing = await Sale.findOne({ financialYear, invoiceNumber: invoiceNo }).select(
      '_id invoicePdfUrl'
    );
    if (existing) {
      // Saved earlier without a PDF? Attach it now.
      if (req.file && !existing.invoicePdfUrl) {
        const safe = invoiceNo.replace(/[^\w-]+/g, '_');
        const up = await uploadPdf(req.file.buffer, `invoice-${financialYear}-${safe}`);
        await Sale.updateOne(
          { _id: existing._id },
          {
            invoicePdfUrl: up.secure_url,
            invoicePdfPublicId: up.public_id,
            pdfUrl: up.secure_url,
            pdfPublicId: up.public_id,
          }
        );
        return res.json({ success: true, duplicate: true, pdfAttached: true, id: existing._id });
      }
      return res.json({ success: true, duplicate: true, id: existing._id });
    }

    // Integration requests have no logged-in user, so attribute records to the admin account
    const owner = (await User.findOne({ role: 'admin' }).sort({ createdAt: 1 })) ||
      (await User.findOne().sort({ createdAt: 1 }));
    if (!owner) {
      return res.status(500).json({ success: false, message: 'No user found to own this record' });
    }

    // Find the party by name (case-insensitive), or create it
    const escaped = receiverName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let party = await Party.findOne({ name: new RegExp(`^${escaped}$`, 'i') });
    if (!party) {
      party = await Party.create({
        name: receiverName,
        address: data.receiverAddress || '',
        gstNumber: (data.receiverGST || '').toUpperCase(),
        type: 'customer',
        createdBy: owner._id,
      });
    }

    const lineItems = items.map((it, i) => ({
      srNo: i + 1,
      materialType: String(it.productName),
      weight: Number(it.quantity) || 0,
      weightUnit: 'kg',
      ratePerKg: Number(it.rate) || 0,
      taxableAmount: Number(it.amount) || 0,
    }));

    const totalWeight = lineItems.reduce((s, l) => s + l.weight, 0);
    const taxableAmount = lineItems.reduce((s, l) => s + l.taxableAmount, 0);
    const gstAmount = Number(data.gstAmount) || 0; // CGST + SGST together
    const half = Math.round((gstAmount / 2) * 100) / 100;

    let pdfUrl = '';
    let pdfPublicId = '';
    if (req.file) {
      const safe = invoiceNo.replace(/[^\w-]+/g, '_');
      const up = await uploadPdf(req.file.buffer, `invoice-${financialYear}-${safe}`);
      pdfUrl = up.secure_url;
      pdfPublicId = up.public_id;
    }

    const sale = await Sale.create({
      billNumber: invoiceNo,
      invoiceNumber: invoiceNo,
      invoiceGenerated: true,
      party: party._id,
      materialType: lineItems[0].materialType,
      weight: totalWeight,
      weightUnit: 'kg',
      ratePerKg: totalWeight ? Math.round((taxableAmount / totalWeight) * 100) / 100 : 0,
      lineItems,
      taxableAmount,
      gstType: 'CGST_SGST',
      gstPercent: Number(data.gstPercent) || 18,
      cgstAmount: half,
      sgstAmount: half,
      igstAmount: 0,
      totalGstAmount: gstAmount,
      roundOff: Number(data.roundOff) || 0,
      totalAmount: Number(data.grandTotal) || taxableAmount + gstAmount,
      billDate: new Date(data.billDate),
      financialYear,
      invoicePdfUrl: pdfUrl,
      invoicePdfPublicId: pdfPublicId,
      pdfUrl,            // also fill the normal bill-PDF fields so the Sales page shows it
      pdfPublicId,
      notes: data.vehicleNo ? `Vehicle: ${data.vehicleNo}` : '',
      createdBy: owner._id,
    });

    res.status(201).json({ success: true, id: sale._id });
  } catch (err) {
    next(err);
  }
};