import React, { useState } from 'react';
import { Modal, Button, Input, Select, ConfirmDialog } from '../ui';
import { formatCurrency, formatDate } from '../../utils/financialYear';
import toast from 'react-hot-toast';

export default function PaymentModal({ open, onClose, record, type, onAddPayment, onDeletePayment }) {
  const [form, setForm] = useState({ amount: '', paymentDate: new Date().toISOString().split('T')[0], mode: 'Cash', note: '', reference: '' });
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  if (!record) return null;

  const paidAmount = record.payments?.reduce((s, p) => s + p.amount, 0) || 0;
  const pendingAmount = record.totalAmount - paidAmount;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Enter valid amount');
    setLoading(true);
    try {
      await onAddPayment(record._id, { ...form, amount: parseFloat(form.amount) });
      setForm({ amount: '', paymentDate: new Date().toISOString().split('T')[0], mode: 'Cash', note: '', reference: '' });
      toast.success('Payment added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Payment History" size="lg">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total', val: formatCurrency(record.totalAmount), color: 'text-gray-900 dark:text-white' },
            { label: 'Paid', val: formatCurrency(paidAmount), color: 'text-green-600 dark:text-green-400' },
            { label: 'Pending', val: formatCurrency(pendingAmount), color: pendingAmount > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
              <div className={`font-mono font-bold text-sm ${color}`}>{val}</div>
            </div>
          ))}
        </div>

        {/* Add Payment */}
        {pendingAmount > 0 && (
          <form onSubmit={handleAdd} className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 mb-5">
            <h3 className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-3">Add Payment</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Input label="Amount (₹)" type="number" step="0.01" min="0.01" max={pendingAmount} value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" required />
              <Input label="Date" type="date" value={form.paymentDate} onChange={e => setForm(p => ({ ...p, paymentDate: e.target.value }))} required />
              <Select label="Mode" value={form.mode} onChange={e => setForm(p => ({ ...p, mode: e.target.value }))}>
                {['Cash', 'Bank', 'UPI', 'Cheque'].map(m => <option key={m}>{m}</option>)}
              </Select>
              <Input label="Reference" value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} placeholder="Cheque no / UTR" />
            </div>
            <Input label="Note" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="Optional note" className="mb-3" />
            <Button type="submit" loading={loading} className="w-full">Add Payment</Button>
          </form>
        )}

        {/* Payment List */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Payment History ({record.payments?.length || 0})</h3>
          {!record.payments?.length ? (
            <div className="text-center py-6 text-gray-400 dark:text-gray-600 text-sm">No payments recorded</div>
          ) : (
            <div className="space-y-2">
              {record.payments.map(payment => (
                <div key={payment._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${payment.mode === 'Cash' ? 'bg-green-500' : payment.mode === 'Bank' ? 'bg-blue-500' : payment.mode === 'UPI' ? 'bg-purple-500' : 'bg-orange-500'}`} />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">{formatCurrency(payment.amount)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{formatDate(payment.paymentDate)} · {payment.mode}{payment.reference ? ` · ${payment.reference}` : ''}</div>
                      {payment.note && <div className="text-xs text-gray-400 dark:text-gray-500 italic">{payment.note}</div>}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteConfirm(payment._id)}
                    className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors px-2 py-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          try {
            await onDeletePayment(record._id, deleteConfirm);
            toast.success('Payment deleted');
            setDeleteConfirm(null);
          } catch {
            toast.error('Failed to delete payment');
          }
        }}
        title="Delete Payment"
        message="Are you sure you want to delete this payment entry?"
        confirmText="Delete Payment"
      />
    </>
  );
}
