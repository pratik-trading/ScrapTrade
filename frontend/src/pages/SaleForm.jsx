import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { saleAPI, partyAPI } from '../services/api';
import { Button, Input, Select, Card } from '../components/ui';
import GSTSection from '../components/ui/GSTSection';
import { calcGST } from '../utils/gstUtils';
import { getFinancialYear, formatCurrency } from '../utils/financialYear';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';

const MATERIALS = ['Iron Scrap', 'Steel Scrap', 'Copper', 'Brass', 'Aluminium',
  'Stainless Steel', 'MS Scrap', 'Cast Iron', 'SS Scrap', 'Other'];

const EMPTY_ITEM = { materialType: '', weight: '', weightUnit: 'kg', ratePerKg: '', taxableAmount: '' };

export default function SaleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { financialYear } = useApp();
  const isEdit = !!id;

  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [form, setForm] = useState({
    billNumber: '',
    party: '',
    gstType: 'CGST_SGST',
    gstPercent: 18,
    billDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
  });

  useEffect(() => {
    partyAPI.getAll().then(res => setParties(res.data.parties));
    if (isEdit) {
      saleAPI.getOne(id).then(res => {
        const s = res.data.sale;
        setForm({
          billNumber: s.billNumber,
          party: s.party._id,
          gstType: s.gstType || 'CGST_SGST',
          gstPercent: s.gstPercent || 18,
          billDate: s.billDate?.split('T')[0] || '',
          dueDate: s.dueDate?.split('T')[0] || '',
          notes: s.notes || '',
        });
        // Load stored line items, or fall back to single-item old format
        if (s.lineItems?.length > 0) {
          setItems(s.lineItems.map(i => ({
            materialType: i.materialType,
            weight: i.weight,
            weightUnit: i.weightUnit || 'kg',
            ratePerKg: i.ratePerKg,
            taxableAmount: i.taxableAmount,
          })));
        } else {
          setItems([{
            materialType: s.materialType,
            weight: s.weight,
            weightUnit: s.weightUnit || 'kg',
            ratePerKg: s.ratePerKg,
            taxableAmount: s.taxableAmount,
          }]);
        }
      });
    }
  }, [id, isEdit]);

  // ── Item field change ──────────────────────────────────────────────────────
  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [name]: value };
      if (name === 'weight' || name === 'ratePerKg') {
        const w = parseFloat(name === 'weight' ? value : updated[index].weight) || 0;
        const r = parseFloat(name === 'ratePerKg' ? value : updated[index].ratePerKg) || 0;
        updated[index].taxableAmount = parseFloat((w * r).toFixed(2));
      }
      return updated;
    });
  };

  const addItem    = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (i) => { if (items.length > 1) setItems(prev => prev.filter((_, idx) => idx !== i)); };

  // ── Computed totals ────────────────────────────────────────────────────────
  const totalTaxable = items.reduce((sum, i) => sum + (parseFloat(i.taxableAmount) || 0), 0);
  const gstCalc      = calcGST(totalTaxable, form.gstType, form.gstPercent);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    for (let i = 0; i < items.length; i++) {
      if (!items[i].materialType || !items[i].weight || !items[i].ratePerKg) {
        toast.error(`Item ${i + 1}: fill in material, weight and rate`);
        return;
      }
    }
    setLoading(true);
    try {
      const formData = new FormData();
      const payload = {
        ...form,
        // Primary fields — first item for backward compat
        materialType: items.map(i => i.materialType).join(', '),
        weight:       items.reduce((s, i) => s + (parseFloat(i.weight) || 0), 0),
        weightUnit:   items[0].weightUnit,
        ratePerKg:    items[0].ratePerKg,
        taxableAmount: totalTaxable,
        lineItems: JSON.stringify(
          items.map((item, idx) => ({
            srNo:          idx + 1,
            materialType:  item.materialType,
            weight:        parseFloat(item.weight) || 0,
            weightUnit:    item.weightUnit,
            ratePerKg:     parseFloat(item.ratePerKg) || 0,
            taxableAmount: parseFloat(item.taxableAmount) || 0,
          }))
        ),
      };
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) formData.append(k, v);
      });
      if (pdfFile) formData.append('pdf', pdfFile);

      if (isEdit) {
        await saleAPI.update(id, formData);
        toast.success('Sale updated');
      } else {
        await saleAPI.create(formData);
        toast.success('Sale created');
      }
      navigate('/sales');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          {isEdit ? 'Edit Sale' : 'New Sale Bill'}
        </h1>
        {form.billDate && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Financial Year: {getFinancialYear(form.billDate)}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Bill Header ───────────────────────────────────────────────── */}
        <Card className="p-6 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bill Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Bill Number *" name="billNumber" value={form.billNumber} onChange={handleFormChange} placeholder="SAL-001" required />
            <Select label="Party *" name="party" value={form.party} onChange={handleFormChange} required>
              <option value="">Select Party</option>
              {parties.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Bill Date *" name="billDate" type="date" value={form.billDate} onChange={handleFormChange} required />
            <Input label="Due Date" name="dueDate" type="date" value={form.dueDate} onChange={handleFormChange} />
          </div>
        </Card>

        {/* ── Line Items ────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Products / Items
            </h3>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-500/20 transition-colors"
            >
              + Add Item
            </button>
          </div>

          {items.map((item, index) => (
            <Card key={index} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Item {index + 1}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 hover:underline"
                  >
                    ✕ Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Material Type *
                  </label>
                  <input
                    list={`materials-${index}`}
                    name="materialType"
                    value={item.materialType}
                    onChange={e => handleItemChange(index, e)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
                    placeholder="MS Scrap"
                    required
                  />
                  <datalist id={`materials-${index}`}>
                    {MATERIALS.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>
                <Select label="Unit" name="weightUnit" value={item.weightUnit} onChange={e => handleItemChange(index, e)}>
                  <option value="kg">Kg</option>
                  <option value="ton">Ton</option>
                  <option value="quintal">Quintal</option>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Weight *"
                  name="weight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.weight}
                  onChange={e => handleItemChange(index, e)}
                  placeholder="0.00"
                  required
                />
                <Input
                  label="Rate / Kg (₹) *"
                  name="ratePerKg"
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.ratePerKg}
                  onChange={e => handleItemChange(index, e)}
                  placeholder="0.00"
                  required
                />
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Amount</label>
                  <div className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 text-gray-900 dark:text-white font-mono">
                    {formatCurrency(item.taxableAmount || 0)}
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {/* Subtotal row — only shown when multiple items */}
          {items.length > 1 && (
            <div className="flex justify-end items-center gap-2 px-1 py-1 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-gray-200 dark:border-gray-700 px-4">
              <span className="text-xs text-gray-500 dark:text-gray-400">Subtotal ({items.length} items, before GST)</span>
              <span className="font-mono font-semibold text-sm text-gray-900 dark:text-white">
                {formatCurrency(totalTaxable)}
              </span>
            </div>
          )}
        </div>

        {/* ── GST ───────────────────────────────────────────────────────── */}
        <GSTSection
          form={{ ...form, taxableAmount: totalTaxable }}
          setForm={(updater) => {
            const next = typeof updater === 'function'
              ? updater({ ...form, taxableAmount: totalTaxable })
              : updater;
            setForm(prev => ({ ...prev, gstType: next.gstType, gstPercent: next.gstPercent }));
          }}
        />

        {/* ── Other ─────────────────────────────────────────────────────── */}
        <Card className="p-4 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Other</h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleFormChange}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:border-orange-400 resize-none"
              placeholder="Optional notes..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Bill PDF / Image</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setPdfFile(e.target.files[0])}
              className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-500/10 dark:file:text-blue-400"
            />
          </div>
        </Card>

        {/* ── Final Total ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl px-5 py-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Final Bill Amount
            {form.gstType !== 'none' && (
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                (Taxable {formatCurrency(totalTaxable)} + GST {formatCurrency(gstCalc.totalGstAmount)})
              </span>
            )}
          </div>
          <div className="text-2xl font-display font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(gstCalc.totalAmount)}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={() => navigate('/sales')}>Cancel</Button>
          <Button type="submit" loading={loading}>{isEdit ? 'Save Changes' : 'Create Sale'}</Button>
        </div>
      </form>
    </div>
  );
}