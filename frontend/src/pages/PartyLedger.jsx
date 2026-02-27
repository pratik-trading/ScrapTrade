import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { partyAPI } from '../services/api';
import { useApp } from '../context/AppContext';
import { Card, Table, StatusBadge, Spinner, StatCard } from '../components/ui';
import { formatCurrency, formatDate } from '../utils/financialYear';
import toast from 'react-hot-toast';

export default function PartyLedger() {
  const { id } = useParams();
  const { financialYear } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    partyAPI.getLedger(id, { financialYear })
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load ledger'))
      .finally(() => setLoading(false));
  }, [id, financialYear]);

  if (loading) return <Spinner />;
  if (!data) return null;

  const { party, purchases, sales, summary } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/parties" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">← Parties</Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{party.name}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            {party.mobile && <span>📞 {party.mobile}</span>}
            {party.gstNumber && <span>GST: {party.gstNumber}</span>}
            <span className="capitalize">{party.type}</span>
            <span>· FY {financialYear}</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Purchase" value={formatCurrency(summary.totalPurchase)} color="orange" icon="↓" />
        <StatCard label="Total Sales" value={formatCurrency(summary.totalSale)} color="blue" icon="↑" />
        <StatCard label="Payable (to them)" value={formatCurrency(summary.pendingPayable)} color="red" icon="⚠" />
        <StatCard label="Receivable (from them)" value={formatCurrency(summary.pendingReceivable)} color="green" icon="✓" />
      </div>

      {/* Purchases Table */}
      {purchases.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="font-display font-semibold text-gray-900 dark:text-white">Purchases ({purchases.length})</h3>
          </div>
          <Table headers={['Bill No', 'Material', 'Date', 'Due Date', { label: 'Amount', right: true }, { label: 'Paid', right: true }, { label: 'Pending', right: true }, 'Status']}>
            {purchases.map(p => {
              const paid = p.paidAmount || 0;
              const pending = p.totalAmount - paid;
              const status = p.isOverdue ? 'Overdue' : p.paymentStatus || (paid >= p.totalAmount ? 'Paid' : paid > 0 ? 'Partial' : 'Pending');
              return (
                <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="py-3 px-4 text-sm font-mono text-gray-900 dark:text-white">{p.billNumber}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{p.materialType}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(p.billDate)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(p.dueDate)}</td>
                  <td className="py-3 px-4 text-sm font-mono text-right text-gray-900 dark:text-white">{formatCurrency(p.totalAmount)}</td>
                  <td className="py-3 px-4 text-sm font-mono text-right text-green-600 dark:text-green-400">{formatCurrency(paid)}</td>
                  <td className="py-3 px-4 text-sm font-mono text-right text-orange-600 dark:text-orange-400">{formatCurrency(pending)}</td>
                  <td className="py-3 px-4"><StatusBadge status={status} /></td>
                </tr>
              );
            })}
          </Table>
        </Card>
      )}

      {/* Sales Table */}
      {sales.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="font-display font-semibold text-gray-900 dark:text-white">Sales ({sales.length})</h3>
          </div>
          <Table headers={['Bill No', 'Material', 'Date', 'Due Date', { label: 'Amount', right: true }, { label: 'Received', right: true }, { label: 'Receivable', right: true }, 'Status']}>
            {sales.map(s => {
              const paid = s.paidAmount || 0;
              const pending = s.totalAmount - paid;
              const status = s.isOverdue ? 'Overdue' : s.paymentStatus || (paid >= s.totalAmount ? 'Paid' : paid > 0 ? 'Partial' : 'Pending');
              return (
                <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="py-3 px-4 text-sm font-mono text-gray-900 dark:text-white">{s.billNumber}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{s.materialType}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(s.billDate)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(s.dueDate)}</td>
                  <td className="py-3 px-4 text-sm font-mono text-right text-gray-900 dark:text-white">{formatCurrency(s.totalAmount)}</td>
                  <td className="py-3 px-4 text-sm font-mono text-right text-green-600 dark:text-green-400">{formatCurrency(paid)}</td>
                  <td className="py-3 px-4 text-sm font-mono text-right text-blue-600 dark:text-blue-400">{formatCurrency(pending)}</td>
                  <td className="py-3 px-4"><StatusBadge status={status} /></td>
                </tr>
              );
            })}
          </Table>
        </Card>
      )}

      {purchases.length === 0 && sales.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No transactions</h3>
          <p className="text-sm text-gray-500">No transactions found for {party.name} in FY {financialYear}</p>
        </Card>
      )}
    </div>
  );
}
