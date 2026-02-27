const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');

exports.getDashboard = async (req, res) => {
  const { financialYear } = req.query;
  const userId = req.user._id;

  const pQuery = { createdBy: userId, ...(financialYear && { financialYear }) };
  const sQuery = { createdBy: userId, ...(financialYear && { financialYear }) };

  const [purchases, sales] = await Promise.all([
    Purchase.find(pQuery).populate('party', 'name'),
    Sale.find(sQuery).populate('party', 'name'),
  ]);

  // Totals
  const totalPurchases = purchases.reduce((s, p) => s + p.totalAmount, 0);
  const totalSales = sales.reduce((s, p) => s + p.totalAmount, 0);

  const totalPurchasePaid = purchases.reduce((s, p) => s + p.paidAmount, 0);
  const totalSalePaid = sales.reduce((s, p) => s + p.paidAmount, 0);

  const totalPayables = totalPurchases - totalPurchasePaid;
  const totalReceivables = totalSales - totalSalePaid;

  // Monthly data
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const monthlyData = months.map((month, i) => {
    const monthIndex = (i + 3) % 12;
    const pTotal = purchases
      .filter(p => new Date(p.billDate).getMonth() === monthIndex)
      .reduce((s, p) => s + p.totalAmount, 0);
    const sTotal = sales
      .filter(s => new Date(s.billDate).getMonth() === monthIndex)
      .reduce((sum, s) => sum + s.totalAmount, 0);
    return { month, purchases: pTotal, sales: sTotal };
  });

  // Material-wise analytics
  const materialMap = {};
  sales.forEach(s => {
    if (!materialMap[s.materialType]) materialMap[s.materialType] = { sales: 0, purchases: 0 };
    materialMap[s.materialType].sales += s.totalAmount;
  });
  purchases.forEach(p => {
    if (!materialMap[p.materialType]) materialMap[p.materialType] = { sales: 0, purchases: 0 };
    materialMap[p.materialType].purchases += p.totalAmount;
  });
  const materialWise = Object.entries(materialMap).map(([material, data]) => ({
    material,
    sales: data.sales,
    purchases: data.purchases,
    profit: data.sales - data.purchases,
  }));

  // Top 5 parties by transaction
  const partyMap = {};
  [...purchases, ...sales].forEach(t => {
    const pid = t.party?._id?.toString();
    const pname = t.party?.name;
    if (!pid) return;
    if (!partyMap[pid]) partyMap[pid] = { name: pname, total: 0 };
    partyMap[pid].total += t.totalAmount;
  });
  const top5Parties = Object.values(partyMap).sort((a, b) => b.total - a.total).slice(0, 5);

  // Status counts
  const purchaseStatus = { Paid: 0, Partial: 0, Pending: 0, Overdue: 0 };
  purchases.forEach(p => {
    const s = p.isOverdue ? 'Overdue' : p.paymentStatus;
    purchaseStatus[s] = (purchaseStatus[s] || 0) + 1;
  });
  const saleStatus = { Paid: 0, Partial: 0, Pending: 0, Overdue: 0 };
  sales.forEach(s => {
    const st = s.isOverdue ? 'Overdue' : s.paymentStatus;
    saleStatus[st] = (saleStatus[st] || 0) + 1;
  });

  res.json({
    success: true,
    data: {
      totalPurchases,
      totalSales,
      totalPayables,
      totalReceivables,
      profit: totalSales - totalPurchases,
      purchaseCount: purchases.length,
      saleCount: sales.length,
      monthlyData,
      materialWise,
      top5Parties,
      purchaseStatus,
      saleStatus,
    },
  });
};
