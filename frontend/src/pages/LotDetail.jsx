import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { lotAPI } from '../services/lotAPI';
import { purchaseAPI, saleAPI } from '../services/api';
import { useApp } from '../context/AppContext';
import { Button, Card, Modal, Input, Select, ConfirmDialog, Spinner, Table } from '../components/ui';
import { formatCurrency, formatDate } from '../utils/financialYear';
import toast from 'react-hot-toast';

const LotStatusBadge = ({ status }) => {
  const config = {
    'Fully Sold': 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
    'Partial': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
    'Unsold': 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400',
  };
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${config[status] || config['Unsold']}`}>{status}</span>;
};

export default function LotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { financialYear } = useApp();

  const [lot, setLot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);

  // Modals
  const [addPurchaseModal, setAddPurchaseModal] = useState(false);
  const [addSaleModal, setAddSaleModal] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(null); // { type: 'purchase'|'sale', entryId }

  // Forms
  const [purchaseForm, setPurchaseForm] = useState({ purchase: '', weight: '', rate: '', amount: '' });
  const [saleForm, setSaleForm] = useState({ sale: '', weight: '', rate: '', amount: '' });
  const [saving, setSaving] = useState(false);

  const fetchLot = async () => {
    try {
      const res = await lotAPI.getOne(id);
      setLot(res.data.lot);
    } catch { toast.error('Failed to load lot'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchLot();
    // Load purchases and sales for dropdowns
    purchaseAPI.getAll({ financialYear }).then(r => setPurchases(r.data.purchases));
    saleAPI.getAll({ financialYear }).then(r => setSales(r.data.sales));
  }, [id, financialYear]);

  // When purchase selected in form, auto-fill weight and rate
  const handlePurchaseSelect = (purchaseId) => {
    const p = purchases.find(p => p._id === purchaseId);
    if (p) {
      setPurchaseForm(prev => ({
        ...prev,
        purchase: purchaseId,
        weight: p.weight,
        rate: p.ratePerKg,
        amount: p.totalAmount,
      }));
    } else {
      setPurchaseForm(prev => ({ ...prev, purchase: purchaseId }));
    }
  };

  const handleSaleSelect = (saleId) => {
    const s = sales.find(s => s._id === saleId);
    if (s) {
      setSaleForm(prev => ({
        ...prev,
        sale: saleId,
        weight: s.weight,
        rate: s.ratePerKg,
        amount: s.totalAmount,
      }));
    } else {
      setSaleForm(prev => ({ ...prev, sale: saleId }));
    }
  };

  // Auto calculate amount when weight/rate change
  const handlePurchaseFormChange = (field, value) => {
    const updated = { ...purchaseForm, [field]: value };
    if (field === 'weight' || field === 'rate') {
      const w = parseFloat(field === 'weight' ? value : updated.weight) || 0;
      const r = parseFloat(field === 'rate' ? value : updated.rate) || 0;
      updated.amount = (w * r).toFixed(2);
    }
    setPurchaseForm(updated);
  };

  const handleSaleFormChange = (field, value) => {
    const updated = { ...saleForm, [field]: value };
    if (field === 'weight' || field === 'rate') {
      const w = parseFloat(field === 'weight' ? value : updated.weight) || 0;
      const r = parseFloat(field === 'rate' ? value : updated.rate) || 0;
      updated.amount = (w * r).toFixed(2);
    }
    setSaleForm(updated);
  };

  const handleAddPurchase = async (e) => {
    e.preventDefault();
    if (!purchaseForm.purchase) return toast.error('Select a purchase bill');
    setSaving(true);
    try {
      const res = await lotAPI.addPurchase(id, {
        purchase: purchaseForm.purchase,
        weight: parseFloat(purchaseForm.weight),
        rate: parseFloat(purchaseForm.rate),
        amount: parseFloat(purchaseForm.amount),
      });
      setLot(res.data.lot);
      setAddPurchaseModal(false);
      setPurchaseForm({ purchase: '', weight: '', rate: '', amount: '' });
      toast.success('Purchase bill linked to lot');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleAddSale = async (e) => {
    e.preventDefault();
    if (!saleForm.sale) return toast.error('Select a sale bill');
    setSaving(true);
    try {
      const res = await lotAPI.addSale(id, {
        sale: saleForm.sale,
        weight: parseFloat(saleForm.weight),
        rate: parseFloat(saleForm.rate),
        amount: parseFloat(saleForm.amount),
      });
      setLot(res.data.lot);
      setAddSaleModal(false);
      setSaleForm({ sale: '', weight: '', rate: '', amount: '' });
      toast.success('Sale bill linked to lot');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleRemove = async () => {
    try {
      let res;
      if (removeConfirm.type === 'purchase') {
        res = await lotAPI.removePurchase(id, removeConfirm.entryId);
      } else {
        res = await lotAPI.removeSale(id, removeConfirm.entryId);
      }
      setLot(res.data.lot);
      setRemoveConfirm(null);
      toast.success('Removed from lot');
    } catch { toast.error('Failed to remove'); }
  };

  // Already linked IDs to prevent duplicates
  const linkedPurchaseIds = lot?.purchases?.map(p => p.purchase?._id) || [];
  const linkedSaleIds = lot?.sales?.map(s => s.sale?._id) || [];
  const availablePurchases = purchases.filter(p => !linkedPurchaseIds.includes(p._id));
  const availableSales = sales.filter(s => !linkedSaleIds.includes(s._id));

  if (loading) return <Spinner />;
  if (!lot) return <div className="text-center py-12 text-gray-500">Lot not found</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/lots" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">← Lots</Link>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{lot.lotNumber}</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            {lot.lotNumber} — {lot.materialType}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <LotStatusBadge status={lot.status} />
            <span className="text-sm text-gray-500 dark:text-gray-400">FY {lot.financialYear}</span>
            {lot.description && <span className="text-sm text-gray-500 dark:text-gray-400">· {lot.description}</span>}
          </div>
        </div>
      </div>

      {/* Profit Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Buy Weight', val: `${lot.totalPurchaseWeight?.toFixed(2)} kg`, color: 'text-gray-900 dark:text-white' },
          { label: 'Sell Weight', val: `${lot.totalSaleWeight?.toFixed(2)} kg`, color: 'text-gray-900 dark:text-white' },
          { label: 'Wt. Difference', val: `${lot.weightDifference > 0 ? '+' : ''}${lot.weightDifference?.toFixed(2)} kg`, color: lot.weightDifference < 0 ? 'text-red-500' : 'text-green-500' },
          { label: 'Purchase Cost', val: formatCurrency(lot.totalPurchaseCost), color: 'text-orange-600 dark:text-orange-400' },
          { label: 'Sale Revenue', val: formatCurrency(lot.totalSaleRevenue), color: 'text-blue-600 dark:text-blue-400' },
        ].map(({ label, val, color }) => (
          <Card key={label} className="p-4 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
            <div className={`text-sm font-display font-bold ${color}`}>{val}</div>
          </Card>
        ))}
      </div>

      {/* Profit Banner */}
      <div className={`rounded-xl p-5 border flex items-center justify-between ${lot.profit >= 0
        ? 'bg-green-50 dark:bg-green-500/5 border-green-200 dark:border-green-500/20'
        : 'bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20'}`}>
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
            {lot.profit >= 0 ? '📈 Net Profit' : '📉 Net Loss'}
          </div>
          <div className={`text-3xl font-display font-bold ${lot.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(lot.profit)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Profit Margin</div>
          <div className={`text-2xl font-display font-bold ${lot.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {lot.profitPercent}%
          </div>
        </div>
      </div>

      {/* Purchases Section */}
      <Card>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h3 className="font-display font-semibold text-gray-900 dark:text-white">
              📥 Incoming Bills (Purchases)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {lot.purchases?.length || 0} bills · {lot.totalPurchaseWeight?.toFixed(2)} kg · {formatCurrency(lot.totalPurchaseCost)}
            </p>
          </div>
          <Button size="sm" onClick={() => setAddPurchaseModal(true)}>+ Link Purchase</Button>
        </div>

        {!lot.purchases?.length ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-600 text-sm">
            No purchase bills linked. Click "Link Purchase" to add.
          </div>
        ) : (
          <Table headers={['Bill No', 'Party', 'Date', { label: 'Weight (kg)', right: true }, { label: 'Rate/kg', right: true }, { label: 'Amount', right: true }, '']}>
            {lot.purchases.map(entry => (
              <tr key={entry._id} className="hover:bg-orange-50/50 dark:hover:bg-orange-500/5">
                <td className="py-3 px-4 text-sm font-mono text-gray-900 dark:text-white">
                  {entry.purchase?.billNumber}
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                  {entry.purchase?.party?.name || '—'}
                </td>
                <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(entry.purchase?.billDate)}
                </td>
                <td className="py-3 px-4 text-sm font-mono text-right text-gray-900 dark:text-white">
                  {entry.weight?.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-sm font-mono text-right text-gray-600 dark:text-gray-400">
                  ₹{entry.rate}
                </td>
                <td className="py-3 px-4 text-sm font-mono text-right font-semibold text-orange-600 dark:text-orange-400">
                  {formatCurrency(entry.amount)}
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => setRemoveConfirm({ type: 'purchase', entryId: entry._id })}
                    className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {/* Total row */}
            <tr className="bg-orange-50 dark:bg-orange-500/5 border-t border-orange-200 dark:border-orange-500/20">
              <td colSpan={3} className="py-2 px-4 text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">Total</td>
              <td className="py-2 px-4 text-sm font-mono text-right font-bold text-orange-700 dark:text-orange-400">{lot.totalPurchaseWeight?.toFixed(2)}</td>
              <td />
              <td className="py-2 px-4 text-sm font-mono text-right font-bold text-orange-700 dark:text-orange-400">{formatCurrency(lot.totalPurchaseCost)}</td>
              <td />
            </tr>
          </Table>
        )}
      </Card>

      {/* Sales Section */}
      <Card>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h3 className="font-display font-semibold text-gray-900 dark:text-white">
              📤 Outgoing Bills (Sales)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {lot.sales?.length || 0} bills · {lot.totalSaleWeight?.toFixed(2)} kg · {formatCurrency(lot.totalSaleRevenue)}
            </p>
          </div>
          <Button size="sm" onClick={() => setAddSaleModal(true)}>+ Link Sale</Button>
        </div>

        {!lot.sales?.length ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-600 text-sm">
            No sale bills linked. Click "Link Sale" to add.
          </div>
        ) : (
          <Table headers={['Bill No', 'Party', 'Date', { label: 'Weight (kg)', right: true }, { label: 'Rate/kg', right: true }, { label: 'Amount', right: true }, '']}>
            {lot.sales.map(entry => (
              <tr key={entry._id} className="hover:bg-blue-50/50 dark:hover:bg-blue-500/5">
                <td className="py-3 px-4 text-sm font-mono text-gray-900 dark:text-white">
                  {entry.sale?.billNumber}
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                  {entry.sale?.party?.name || '—'}
                </td>
                <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(entry.sale?.billDate)}
                </td>
                <td className="py-3 px-4 text-sm font-mono text-right text-gray-900 dark:text-white">
                  {entry.weight?.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-sm font-mono text-right text-gray-600 dark:text-gray-400">
                  ₹{entry.rate}
                </td>
                <td className="py-3 px-4 text-sm font-mono text-right font-semibold text-blue-600 dark:text-blue-400">
                  {formatCurrency(entry.amount)}
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => setRemoveConfirm({ type: 'sale', entryId: entry._id })}
                    className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {/* Total row */}
            <tr className="bg-blue-50 dark:bg-blue-500/5 border-t border-blue-200 dark:border-blue-500/20">
              <td colSpan={3} className="py-2 px-4 text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Total</td>
              <td className="py-2 px-4 text-sm font-mono text-right font-bold text-blue-700 dark:text-blue-400">{lot.totalSaleWeight?.toFixed(2)}</td>
              <td />
              <td className="py-2 px-4 text-sm font-mono text-right font-bold text-blue-700 dark:text-blue-400">{formatCurrency(lot.totalSaleRevenue)}</td>
              <td />
            </tr>
          </Table>
        )}
      </Card>

      {/* Add Purchase Modal */}
      <Modal open={addPurchaseModal} onClose={() => setAddPurchaseModal(false)} title="Link Purchase Bill to Lot" size="md">
        <form onSubmit={handleAddPurchase} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Select Purchase Bill *
            </label>
            <select
              value={purchaseForm.purchase}
              onChange={e => handlePurchaseSelect(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:border-orange-400"
              required
            >
              <option value="">Select a purchase bill...</option>
              {availablePurchases.map(p => (
                <option key={p._id} value={p._id}>
                  {p.billNumber} — {p.party?.name} — {formatDate(p.billDate)} — {formatCurrency(p.totalAmount)} — {p.weight}kg
                </option>
              ))}
            </select>
            {availablePurchases.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">All purchase bills in this FY are already linked.</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Weight (kg) *" type="number" step="0.01" value={purchaseForm.weight}
              onChange={e => handlePurchaseFormChange('weight', e.target.value)} placeholder="0.00" required />
            <Input label="Rate/kg *" type="number" step="0.01" value={purchaseForm.rate}
              onChange={e => handlePurchaseFormChange('rate', e.target.value)} placeholder="0.00" required />
            <Input label="Amount (₹) *" type="number" step="0.01" value={purchaseForm.amount}
              onChange={e => handlePurchaseFormChange('amount', e.target.value)} placeholder="Auto" required />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            You can adjust weight/rate if only part of the purchase is mapped to this lot.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setAddPurchaseModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Link Purchase</Button>
          </div>
        </form>
      </Modal>

      {/* Add Sale Modal */}
      <Modal open={addSaleModal} onClose={() => setAddSaleModal(false)} title="Link Sale Bill to Lot" size="md">
        <form onSubmit={handleAddSale} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Select Sale Bill *
            </label>
            <select
              value={saleForm.sale}
              onChange={e => handleSaleSelect(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:border-orange-400"
              required
            >
              <option value="">Select a sale bill...</option>
              {availableSales.map(s => (
                <option key={s._id} value={s._id}>
                  {s.billNumber} — {s.party?.name} — {formatDate(s.billDate)} — {formatCurrency(s.totalAmount)} — {s.weight}kg
                </option>
              ))}
            </select>
            {availableSales.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">All sale bills in this FY are already linked.</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Weight (kg) *" type="number" step="0.01" value={saleForm.weight}
              onChange={e => handleSaleFormChange('weight', e.target.value)} placeholder="0.00" required />
            <Input label="Rate/kg *" type="number" step="0.01" value={saleForm.rate}
              onChange={e => handleSaleFormChange('rate', e.target.value)} placeholder="0.00" required />
            <Input label="Amount (₹) *" type="number" step="0.01" value={saleForm.amount}
              onChange={e => handleSaleFormChange('amount', e.target.value)} placeholder="Auto" required />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            You can adjust weight/rate if only part of the sale is mapped to this lot.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setAddSaleModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Link Sale</Button>
          </div>
        </form>
      </Modal>

      {/* Remove Confirm */}
      <ConfirmDialog
        open={!!removeConfirm}
        onClose={() => setRemoveConfirm(null)}
        onConfirm={handleRemove}
        title={`Remove ${removeConfirm?.type === 'purchase' ? 'Purchase' : 'Sale'}`}
        message="This will only remove the link from this lot. The original bill will not be deleted."
        confirmText="Remove"
      />
    </div>
  );
}