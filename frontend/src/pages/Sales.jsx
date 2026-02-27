import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { saleAPI, partyAPI } from '../services/api';
import { Button, StatusBadge, Card, Table, EmptyState, Spinner, ConfirmDialog, Input, Select } from '../components/ui';
import PaymentModal from '../components/modals/PaymentModal';
import { formatCurrency, formatDate } from '../utils/financialYear';
import toast from 'react-hot-toast';
import PDFButton from '../components/modals/PDFButton';

export default function Sales() {
  const { financialYear } = useApp();
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [partyFilter, setPartyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [paymentRecord, setPaymentRecord] = useState(null);

  useEffect(() => {
    partyAPI.getAll().then(res => setParties(res.data.parties)).catch(() => { });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { financialYear };
    if (search) params.search = search;
    if (partyFilter) params.party = partyFilter;
    if (statusFilter) params.status = statusFilter;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    saleAPI.getAll(params)
      .then(res => { if (!cancelled) setSales(res.data.sales); })
      .catch(() => { if (!cancelled) toast.error('Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [financialYear, search, partyFilter, statusFilter, startDate, endDate]);

  const refetch = () => {
    setLoading(true);
    const params = { financialYear };
    if (search) params.search = search;
    if (partyFilter) params.party = partyFilter;
    saleAPI.getAll(params)
      .then(res => setSales(res.data.sales))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  const handleDelete = async () => {
    try {
      await saleAPI.delete(deleteId);
      toast.success('Sale deleted');
      setDeleteId(null);
      refetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const handleAddPayment = async (id, data) => {
    const res = await saleAPI.addPayment(id, data);
    setSales(prev => prev.map(s => s._id === id ? res.data.sale : s));
    setPaymentRecord(res.data.sale);
  };

  const handleDeletePayment = async (id, paymentId) => {
    const res = await saleAPI.deletePayment(id, paymentId);
    setSales(prev => prev.map(s => s._id === id ? res.data.sale : s));
    setPaymentRecord(res.data.sale);
  };

  const totalAmount = sales.reduce((s, p) => s + p.totalAmount, 0);
  const totalPaid = sales.reduce((s, p) => s + (p.paidAmount || 0), 0);
  const totalPending = totalAmount - totalPaid;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Sales</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{financialYear} · {sales.length} bills</p>
        </div>
        <Button onClick={() => navigate('/sales/new')}>+ New Sale</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', val: formatCurrency(totalAmount), color: 'text-gray-900 dark:text-white' },
          { label: 'Received', val: formatCurrency(totalPaid), color: 'text-green-600 dark:text-green-400' },
          { label: 'Receivable', val: formatCurrency(totalPending), color: 'text-blue-600 dark:text-blue-400' },
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
        {loading ? <Spinner /> : sales.length === 0 ? (
          <EmptyState
            title="No sales found"
            description="Add your first sale bill to get started"
            action={<Button onClick={() => navigate('/sales/new')}>Add Sale</Button>}
          />
        ) : (
          <Table headers={['Bill No', 'Party', 'Material', 'Date', 'Due Date', { label: 'Total', right: true }, { label: 'Received', right: true }, { label: 'Receivable', right: true }, 'Status', 'Actions']}>
            {sales.map(s => {
              const paid = s.paidAmount || 0;
              const pending = s.totalAmount - paid;
              const status = s.isOverdue ? 'Overdue' : s.paymentStatus || (paid >= s.totalAmount ? 'Paid' : paid > 0 ? 'Partial' : 'Pending');
              return (
                <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 px-4 text-sm font-mono text-gray-900 dark:text-white">{s.billNumber}</td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{s.party?.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{s.materialType}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(s.billDate)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(s.dueDate)}</td>
                  <td className="py-3 px-4 text-sm font-mono text-right text-gray-900 dark:text-white">{formatCurrency(s.totalAmount)}</td>
                  <td className="py-3 px-4 text-sm font-mono text-right text-green-600 dark:text-green-400">{formatCurrency(paid)}</td>
                  <td className="py-3 px-4 text-sm font-mono text-right text-blue-600 dark:text-blue-400">{formatCurrency(pending)}</td>
                  <td className="py-3 px-4"><StatusBadge status={status} /></td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPaymentRecord(s)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Payments</button>
                      <PDFButton pdfUrl={s.pdfUrl} billNumber={s.billNumber} />                      
                      <Link to={`/sales/${s._id}/edit`} className="text-xs text-orange-600 dark:text-orange-400 hover:underline">Edit</Link>
                      <button onClick={() => setDeleteId(s._id)} className="text-xs text-red-600 dark:text-red-400 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Sale" message="Are you sure? This will permanently delete this sale bill and all payment records." />
      <PaymentModal open={!!paymentRecord} onClose={() => setPaymentRecord(null)} record={paymentRecord} type="sale" onAddPayment={handleAddPayment} onDeletePayment={handleDeletePayment} />
    </div>
  );
}