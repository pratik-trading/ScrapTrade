const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const toCSV = (headers, rows) => {
  const headerLine = headers.join(',');
  const rowLines = rows.map(row => headers.map(h => {
    const val = row[h] !== undefined ? row[h] : '';
    return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
  }).join(','));
  return [headerLine, ...rowLines].join('\n');
};

exports.exportPurchases = async (req, res) => {
  const { financialYear, startDate, endDate } = req.query;
  const query = { createdBy: req.user._id };
  if (financialYear) query.financialYear = financialYear;
  if (startDate || endDate) {
    query.billDate = {};
    if (startDate) query.billDate.$gte = new Date(startDate);
    if (endDate) query.billDate.$lte = new Date(endDate);
  }
  const purchases = await Purchase.find(query).populate('party', 'name mobile gstNumber').sort({ billDate: -1 });

  const rows = purchases.map(p => ({
    'Bill Number': p.billNumber,
    'Party Name': p.party?.name || '',
    'Party Mobile': p.party?.mobile || '',
    'GST Number': p.party?.gstNumber || '',
    'Material Type': p.materialType,
    'Weight': p.weight,
    'Weight Unit': p.weightUnit,
    'Rate Per Kg': p.ratePerKg,
    'Total Amount': p.totalAmount,
    'Paid Amount': p.paidAmount,
    'Pending Amount': p.pendingAmount,
    'Status': p.isOverdue ? 'Overdue' : p.paymentStatus,
    'Bill Date': new Date(p.billDate).toLocaleDateString('en-IN'),
    'Due Date': p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-IN') : '',
    'Financial Year': p.financialYear,
    'Notes': p.notes,
  }));

  const headers = Object.keys(rows[0] || {});
  const csv = toCSV(headers, rows);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=purchases-${financialYear || 'all'}.csv`);
  res.send(csv);
};

exports.exportSales = async (req, res) => {
  const { financialYear, startDate, endDate } = req.query;
  const query = { createdBy: req.user._id };
  if (financialYear) query.financialYear = financialYear;
  if (startDate || endDate) {
    query.billDate = {};
    if (startDate) query.billDate.$gte = new Date(startDate);
    if (endDate) query.billDate.$lte = new Date(endDate);
  }
  const sales = await Sale.find(query).populate('party', 'name mobile gstNumber').sort({ billDate: -1 });

  const rows = sales.map(s => ({
    'Bill Number': s.billNumber,
    'Party Name': s.party?.name || '',
    'Party Mobile': s.party?.mobile || '',
    'GST Number': s.party?.gstNumber || '',
    'Material Type': s.materialType,
    'Weight': s.weight,
    'Weight Unit': s.weightUnit,
    'Rate Per Kg': s.ratePerKg,
    'Total Amount': s.totalAmount,
    'Paid Amount': s.paidAmount,
    'Pending Amount': s.pendingAmount,
    'Status': s.isOverdue ? 'Overdue' : s.paymentStatus,
    'Bill Date': new Date(s.billDate).toLocaleDateString('en-IN'),
    'Due Date': s.dueDate ? new Date(s.dueDate).toLocaleDateString('en-IN') : '',
    'Financial Year': s.financialYear,
    'Notes': s.notes,
  }));

  const headers = Object.keys(rows[0] || {});
  const csv = toCSV(headers, rows);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=sales-${financialYear || 'all'}.csv`);
  res.send(csv);
};

// ───────── Party-wise trade report ─────────
const num = v => parseFloat(v) || 0;
const r2 = v => Math.round((v + Number.EPSILON) * 100) / 100;

// Indian FY quarters: Q1 Apr-Jun, Q2 Jul-Sep, Q3 Oct-Dec, Q4 Jan-Mar (next calendar year)
const quarterRange = (financialYear, quarter) => {
  const y = parseInt(String(financialYear).slice(0, 4), 10); // "2025-2026" -> 2025
  if (!y) return null;
  const q = {
    Q1: [new Date(y, 3, 1), new Date(y, 5, 30, 23, 59, 59, 999)],
    Q2: [new Date(y, 6, 1), new Date(y, 8, 30, 23, 59, 59, 999)],
    Q3: [new Date(y, 9, 1), new Date(y, 11, 31, 23, 59, 59, 999)],
    Q4: [new Date(y + 1, 0, 1), new Date(y + 1, 2, 31, 23, 59, 59, 999)],
  }[quarter];
  return q ? { from: q[0], to: q[1] } : null;
};

// GET /api/reports/party-trades?party=ID&type=purchase|sale
//     &financialYear=2025-2026 [&quarter=Q1..Q4]  OR  &startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Response: bills[] — one entry per invoice, each with its material lines[]
exports.getPartyTrades = async (req, res) => {
  const { party, type = 'purchase', financialYear, quarter, startDate, endDate } = req.query;
  const includePaymentStatus = req.query.includePaymentStatus === 'true';   // ← add this line
  if (!party) return res.status(400).json({ success: false, message: 'Party is required.' });

  const Model = type === 'sale' ? Sale : Purchase;
  const query = { createdBy: req.user._id, party };

  if (startDate || endDate) {
    // custom range wins over FY / quarter
    query.billDate = {};
    if (startDate) query.billDate.$gte = new Date(startDate);
    if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); query.billDate.$lte = e; }
  } else if (financialYear) {
    query.financialYear = financialYear;
    if (quarter) {
      const range = quarterRange(financialYear, quarter);
      if (!range) return res.status(400).json({ success: false, message: 'Invalid quarter / financial year.' });
      query.billDate = { $gte: range.from, $lte: range.to };
    }
  }

  const docs = await Model.find(query)
    .populate('party', 'name mobile gstNumber')
    .sort({ billDate: 1, createdAt: 1 });

  const bills = docs.map(b => {
    const taxable = num(b.taxableAmount);
    const gst = num(b.totalGstAmount);
    const total = num(b.totalAmount);
    // multi-material bills use lineItems; older/simple bills use the bill's own fields
    const source = Array.isArray(b.lineItems) && b.lineItems.length ? b.lineItems : [b];
    const lines = source.map(it => {
      const weight = num(it.weight);
      const rate = num(it.ratePerKg);
      return {
        material: it.materialType || b.materialType || '',
        weight,
        unit: it.weightUnit || b.weightUnit || 'kg',
        rate,
        amount: r2(num(it.taxableAmount) || weight * rate),
      };
    });
    const bill = {
      id: b._id,
      billDate: b.billDate,
      billNumber: b.billNumber,
      lines,
      amount: r2(lines.reduce((s, l) => s + l.amount, 0)),
      gst,
      other: r2(total - taxable - gst),   // TCS / other charges / round-off
      total,
    };

    if (includePaymentStatus) {
      const paid = r2(num(b.paidAmount));
      bill.paidAmount = paid;
      bill.pendingAmount = r2(Math.max(total - paid, 0));
      bill.paymentStatus = b.isOverdue ? 'Overdue' : b.paymentStatus; // Paid | Partial | Pending | Overdue
      bill.isPaid = paid >= total;
      bill.dueDate = b.dueDate || null;
    }
    return bill;
  });

  const sum = k => r2(bills.reduce((s, b) => s + b[k], 0));
  const weightByUnit = {};
  bills.forEach(b => b.lines.forEach(l => { weightByUnit[l.unit] = r2((weightByUnit[l.unit] || 0) + l.weight); }));

  const summary = { amount: sum('amount'), gst: sum('gst'), other: sum('other'), total: sum('total'), weightByUnit };
  if (includePaymentStatus) {
    summary.paid = sum('paidAmount');
    summary.pending = sum('pendingAmount');
    summary.paidBills = bills.filter(b => b.isPaid).length;
    summary.unpaidBills = bills.filter(b => !b.isPaid).length;
  }

    res.json({
    success: true,
    type,
    party: docs[0]?.party || null,
    count: bills.length,
    bills,
    summary,
  });
};
