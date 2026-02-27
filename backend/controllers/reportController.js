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
