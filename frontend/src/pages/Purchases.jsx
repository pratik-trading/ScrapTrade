import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { purchaseAPI, partyAPI } from '../services/api';
import { Button, StatusBadge, Card, Table, EmptyState, Spinner, ConfirmDialog, Input, Select } from '../components/ui';
import PaymentModal from '../components/modals/PaymentModal';
import { formatCurrency, formatDate } from '../utils/financialYear';
import toast from 'react-hot-toast';
import PDFButton from '../components/modals/PDFButton';

export default function Purchases() {
  const { financialYear } = useApp();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [partyFilter, setPartyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [paymentRecord, setPaymentRecord] = useState(null);

  // Load parties once
  useEffect(() => {
    partyAPI.getAll().then(res => setParties(res.data.parties)).catch(() => {});
  }, []);

  // Load purchases when filters change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { financialYear };
    if (search) params.search = search;
    if (partyFilter) params.party = partyFilter;
    if (statusFilter) params.status = statusFilter;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    purchaseAPI.getAll(params)
      .then(res => { if (!cancelled) setPurchases(res.data.purchases); })
      .catch(() => { if (!cancelled) toast.error('Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [financialYear, search, partyFilter, statusFilter, startDate, endDate]);

  const refetch = () => {
    setLoading(true);
    const params = { financialYear };
    if (search) params.search = search;
    if (partyFilter) params.party = partyFilter;
    if (statusFilter) params.status = statusFilter;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    purchaseAPI.getAll(params)
      .then(res => setPurchases(res.data.purchases))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  const handleDelete = async () => {
    try {
      await purchaseAPI.delete(deleteId);
      toast.success('Purchase deleted');
      setDeleteId(null);
      refetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const handleAddPayment = async (id, data) => {
    const res = await purchaseAPI.addPayment(id, data);
    setPurchases(prev => prev.map(p => p._id === id ? res.data.purchase : p));
    setPaymentRecord(res.data.purchase);
  };

  const handleDeletePayment = async (id, paymentId) => {
    const res = await purchaseAPI.deletePayment(id, paymentId);
    setPurchases(prev => prev.map(p => p._id === id ? res.data.purchase : p));
    setPaymentRecord(res.data.purchase);
  };

  const totalAmount = purchases.reduce((s, p) => s + p.totalAmount, 0);
  const totalPaid = purchases.reduce((s, p) => s + (p.paidAmount || 0), 0);
  const totalPending = totalAmount - totalPaid;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Purchases</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{financialYear} · {purchases.length} bills</p>
        </div>
        <Button onClick={() => navigate('/purchases/new')}>+ New Purchase</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', val: formatCurrency(totalAmount), color: 'text-gray-900 dark:text-white' },
          { label: 'Paid', val: formatCurrency(totalPaid), color: 'text-green-600 dark:text-green-400' },
          { label: 'Pending (Payable)', val: formatCurrency(totalPending), color: 'text-orange-600 dark:text-orange-400' },
        ].map(({ label, val, color }) => (
          <Card key={label} className="p-4 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
            <div className={`text-xl font-display font-bold ${color}`}>{val}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Input placeholder="Search bill number..." value={search} onChange={e => setSearch(e.target.value)} />
          <Select value={partyFilter} onChange={e => setPartyFilter(e.target.value)}>
            <option value="">All Parties</option>
            {parties.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </Select>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {['Paid', 'Partial', 'Pending', 'Overdue'].map(s => <option key={s}>{s}</option>)}
          </Select>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </Card>

      <Card>
        {loading ? <Spinner /> : purchases.length === 0 ? (
          <EmptyState
            title="No purchases found"
            description="Add your first purchase bill to get started"
            action={<Button onClick={() => navigate('/purchases/new')}>Add Purchase</Button>}
          />
        ) : (
          <Table headers={['Bill No', 'Party', 'Material', 'Date', 'Due Date', { label: 'Total', right: true }, { label: 'Paid', right: true }, { label: 'Pending', right: true }, 'Status', 'Actions']}>
            {purchases.map(p => {
              const paid = p.paidAmount || 0;
              const pending = p.totalAmount - paid;
              const status = p.isOverdue ? 'Overdue' : p.paymentStatus || (paid >= p.totalAmount ? 'Paid' : paid > 0 ? 'Partial' : 'Pending');
              return (
                <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 px-4 text-sm font-mono text-gray-900 dark:text-white">{p.billNumber}</td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{p.party?.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{p.materialType}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(p.billDate)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(p.dueDate)}</td>
                  <td className="py-3 px-4 text-sm font-mono text-right text-gray-900 dark:text-white">{formatCurrency(p.totalAmount)}</td>
                  <td className="py-3 px-4 text-sm font-mono text-right text-green-600 dark:text-green-400">{formatCurrency(paid)}</td>
                  <td className="py-3 px-4 text-sm font-mono text-right text-orange-600 dark:text-orange-400">{formatCurrency(pending)}</td>
                  <td className="py-3 px-4"><StatusBadge status={status} /></td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPaymentRecord(p)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Payments</button>
                      <PDFButton pdfUrl={p.pdfUrl} billNumber={p.billNumber} />                      
                      <Link to={`/purchases/${p._id}/edit`} className="text-xs text-orange-600 dark:text-orange-400 hover:underline">Edit</Link>
                      <button onClick={() => setDeleteId(p._id)} className="text-xs text-red-600 dark:text-red-400 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Purchase" message="Are you sure? This will permanently delete this purchase bill and all its payment records." />
      <PaymentModal open={!!paymentRecord} onClose={() => setPaymentRecord(null)} record={paymentRecord} type="purchase" onAddPayment={handleAddPayment} onDeletePayment={handleDeletePayment} />
    </div>
  );
}