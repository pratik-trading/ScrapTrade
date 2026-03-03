import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { purchaseAPI, partyAPI } from '../services/api';
import { Button, Input, Select, Card } from '../components/ui';
import { getFinancialYear, formatCurrency } from '../utils/financialYear';
import toast from 'react-hot-toast';

const MATERIALS = ['Iron Scrap', 'Steel Scrap', 'Copper', 'Brass', 'Aluminium',
  'Stainless Steel', 'MS Scrap', 'Cast Iron', 'Other'];

const EMPTY_ITEM = { materialType: '', weight: '', weightUnit: 'kg', ratePerKg: '', taxableAmount: '' };

// mirrors backend calcTotals
const calcTotals = ({ taxableAmount, gstType, gstPercent, tcsApplicable, tcsPercent, otherCharges }) => {
  const taxable = parseFloat(taxableAmount) || 0;
  const gstPct  = parseFloat(gstPercent) || 0;
  const tcsPct  = parseFloat(tcsPercent) || 0;
  const others  = parseFloat(otherCharges) || 0;

  const gstAmt = gstType === 'none' ? 0 : parseFloat(((taxable * gstPct) / 100).toFixed(2));
  const half   = parseFloat((gstAmt / 2).toFixed(2));
  const cgst   = gstType === 'CGST_SGST' ? half : 0;
  const sgst   = gstType === 'CGST_SGST' ? half : 0;
  const igst   = gstType === 'IGST'      ? gstAmt : 0;

  // TCS base = taxableAmount only (CBDT Circular 17/2020 — excludes GST)
  const tcsAmt   = tcsApplicable ? parseFloat(((taxable * tcsPct) / 100).toFixed(2)) : 0;

  // Final: taxable + GST + TCS + otherCharges
  const preRound = taxable + gstAmt + tcsAmt + others;
  const total    = Math.round(preRound);
  const roundOff = parseFloat((total - preRound).toFixed(2));

  return { cgst, sgst, igst, gstAmt, tcsAmt, roundOff, total };
};

export default function PurchaseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [items, setItems]     = useState([{ ...EMPTY_ITEM }]);

  const [form, setForm] = useState({
    billNumber: '',
    party: '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    gstType: 'CGST_SGST',
    gstPercent: 18,
    tcsApplicable: false,
    tcsPercent: 1,
    otherCharges: '',
    otherChargesLabel: 'Freight / Other Charges',
    notes: '',
  });

  useEffect(() => {
    partyAPI.getAll().then(res => setParties(res.data.parties));
    if (isEdit) {
      purchaseAPI.getOne(id).then(res => {
        const p = res.data.purchase;
        setForm({
          billNumber:        p.billNumber,
          party:             p.party._id,
          billDate:          p.billDate?.split('T')[0]  || '',
          dueDate:           p.dueDate?.split('T')[0]   || '',
          gstType:           p.gstType           || 'CGST_SGST',
          gstPercent:        p.gstPercent         || 18,
          tcsApplicable:     p.tcsApplicable      || false,
          tcsPercent:        p.tcsPercent         || 1,
          otherCharges:      p.otherCharges       || '',
          otherChargesLabel: p.otherChargesLabel  || 'Freight / Other Charges',
          notes:             p.notes              || '',
        });
        if (p.lineItems?.length > 0) {
          setItems(p.lineItems.map(i => ({
            materialType:  i.materialType,
            weight:        i.weight,
            weightUnit:    i.weightUnit || 'kg',
            ratePerKg:     i.ratePerKg,
            taxableAmount: i.taxableAmount,
          })));
        } else {
          setItems([{
            materialType:  p.materialType,
            weight:        p.weight,
            weightUnit:    p.weightUnit || 'kg',
            ratePerKg:     p.ratePerKg,
            taxableAmount: p.taxableAmount || p.totalAmount,
          }]);
        }
      });
    }
  }, [id, isEdit]);

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [name]: value };
      if (name === 'weight' || name === 'ratePerKg') {
        const w = parseFloat(name === 'weight'    ? value : updated[index].weight)    || 0;
        const r = parseFloat(name === 'ratePerKg' ? value : updated[index].ratePerKg) || 0;
        updated[index].taxableAmount = parseFloat((w * r).toFixed(2));
      }
      return updated;
    });
  };

  const addItem    = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (i) => { if (items.length > 1) setItems(prev => prev.filter((_, idx) => idx !== i)); };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const totalTaxable = items.reduce((sum, i) => sum + (parseFloat(i.taxableAmount) || 0), 0);
  const calc = calcTotals({
    taxableAmount: totalTaxable,
    gstType:       form.gstType,
    gstPercent:    form.gstPercent,
    tcsApplicable: form.tcsApplicable,
    tcsPercent:    form.tcsPercent,
    otherCharges:  form.otherCharges,
  });

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
      const payload = {
        ...form,
        materialType:  items.map(i => i.materialType).join(', '),
        weight:        items.reduce((s, i) => s + (parseFloat(i.weight) || 0), 0),
        weightUnit:    items[0].weightUnit,
        ratePerKg:     items[0].ratePerKg,
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
      const formData = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) formData.append(k, v);
      });
      if (pdfFile) formData.append('pdf', pdfFile);

      if (isEdit) {
        await purchaseAPI.update(id, formData);
        toast.success('Purchase updated');
      } else {
        await purchaseAPI.create(formData);
        toast.success('Purchase created');
      }
      navigate('/purchases');
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
          {isEdit ? 'Edit Purchase' : 'New Purchase Bill'}
        </h1>
        {form.billDate && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Financial Year: {getFinancialYear(form.billDate)}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Bill Header ───────────────────────────────────────────────── */}
        <Card className="p-6 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bill Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Bill Number *" name="billNumber" value={form.billNumber} onChange={handleFormChange} placeholder="PUR-001" required />
            <Select label="Party *" name="party" value={form.party} onChange={handleFormChange} required>
              <option value="">Select Party</option>
              {parties.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Bill Date *" name="billDate" type="date" value={form.billDate} onChange={handleFormChange} required />
            <Input label="Due Date"    name="dueDate"  type="date" value={form.dueDate}  onChange={handleFormChange} />
          </div>
        </Card>

        {/* ── Line Items ────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Products / Items</h3>
            <button type="button" onClick={addItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-500/20 transition-colors">
              + Add Item
            </button>
          </div>

          {items.map((item, index) => (
            <Card key={index} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Item {index + 1}</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)}
                    className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 hover:underline">
                    ✕ Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Material Type *</label>
                  <input list={`materials-${index}`} name="materialType" value={item.materialType}
                    onChange={e => handleItemChange(index, e)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
                    placeholder="Iron Scrap" required />
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
                <Input label="Weight *" name="weight" type="number" step="0.01" min="0"
                  value={item.weight} onChange={e => handleItemChange(index, e)} placeholder="0.00" required />
                <Input label="Rate / Kg (₹) *" name="ratePerKg" type="number" step="0.01" min="0"
                  value={item.ratePerKg} onChange={e => handleItemChange(index, e)} placeholder="0.00" required />
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Taxable Amount</label>
                  <div className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 text-gray-900 dark:text-white font-mono">
                    {formatCurrency(item.taxableAmount || 0)}
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {items.length > 1 && (
            <div className="flex justify-end items-center gap-2 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Subtotal ({items.length} items, before taxes)</span>
              <span className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{formatCurrency(totalTaxable)}</span>
            </div>
          )}
        </div>

        {/* ── GST ───────────────────────────────────────────────────────── */}
        <Card className="p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">GST</h3>
          <div className="grid grid-cols-2 gap-4">
            <Select label="GST Type" name="gstType" value={form.gstType} onChange={handleFormChange}>
              <option value="CGST_SGST">CGST + SGST</option>
              <option value="IGST">IGST</option>
              <option value="none">None / Exempt</option>
            </Select>
            {form.gstType !== 'none' && (
              <Input label="GST %" name="gstPercent" type="number" step="0.01" min="0" max="100"
                value={form.gstPercent} onChange={handleFormChange} placeholder="18" />
            )}
          </div>
          {form.gstType !== 'none' && (
            <div className="grid grid-cols-2 gap-3">
              {form.gstType === 'CGST_SGST' ? (
                <>
                  <div className="flex justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">CGST ({form.gstPercent / 2}%)</span>
                    <span className="font-mono font-medium text-gray-900 dark:text-white">{formatCurrency(calc.cgst)}</span>
                  </div>
                  <div className="flex justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">SGST ({form.gstPercent / 2}%)</span>
                    <span className="font-mono font-medium text-gray-900 dark:text-white">{formatCurrency(calc.sgst)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 text-sm col-span-2">
                  <span className="text-gray-500 dark:text-gray-400">IGST ({form.gstPercent}%)</span>
                  <span className="font-mono font-medium text-gray-900 dark:text-white">{formatCurrency(calc.igst)}</span>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ── TCS ───────────────────────────────────────────────────────── */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">TCS</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Tax Collected at Source — Sec 206C (scrap)</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="relative">
                <input type="checkbox" name="tcsApplicable" checked={form.tcsApplicable} onChange={handleFormChange} className="sr-only" />
                <div className={`w-10 h-6 rounded-full transition-colors ${form.tcsApplicable ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.tcsApplicable ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {form.tcsApplicable ? 'Applicable' : 'Not Applicable'}
              </span>
            </label>
          </div>

          {form.tcsApplicable && (
            <>
              <div className="grid grid-cols-2 gap-4 items-end">
                <Input label="TCS %" name="tcsPercent" type="number" step="0.01" min="0" max="100"
                  value={form.tcsPercent} onChange={handleFormChange} placeholder="1" />
                <div className="flex justify-between px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
                  <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">TCS Amount</span>
                  <span className="font-mono font-semibold text-orange-700 dark:text-orange-300">{formatCurrency(calc.tcsAmt)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Applied on taxable amount only: {formatCurrency(totalTaxable)}
                <span className="ml-1 text-gray-300 dark:text-gray-600">(GST excluded per CBDT Circular 17/2020)</span>
              </p>
            </>
          )}
        </Card>

        {/* ── Other Charges ─────────────────────────────────────────────── */}
        <Card className="p-5 space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Other Charges</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Label" name="otherChargesLabel" value={form.otherChargesLabel}
              onChange={handleFormChange} placeholder="Freight / Other Charges" />
            <Input label="Amount (₹)" name="otherCharges" type="number" step="0.01" min="0"
              value={form.otherCharges} onChange={handleFormChange} placeholder="0.00" />
          </div>
        </Card>

        {/* ── Other ─────────────────────────────────────────────────────── */}
        <Card className="p-4 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Other</h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleFormChange} rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 resize-none"
              placeholder="Optional notes..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Bill PDF / Image</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setPdfFile(e.target.files[0])}
              className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-orange-50 file:text-orange-700 dark:file:bg-orange-500/10 dark:file:text-orange-400 hover:file:bg-orange-100 dark:hover:file:bg-orange-500/20" />
          </div>
        </Card>

        {/* ── Bill Summary ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bill Summary</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <div className="flex justify-between px-4 py-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Taxable Amount</span>
              <span className="font-mono text-gray-900 dark:text-white">{formatCurrency(totalTaxable)}</span>
            </div>
            {form.gstType !== 'none' && (
              <div className="flex justify-between px-4 py-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {form.gstType === 'IGST' ? `IGST (${form.gstPercent}%)` : `CGST + SGST (${form.gstPercent}%)`}
                </span>
                <span className="font-mono text-gray-900 dark:text-white">{formatCurrency(calc.gstAmt)}</span>
              </div>
            )}
            {parseFloat(form.otherCharges) > 0 && (
              <div className="flex justify-between px-4 py-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400">{form.otherChargesLabel || 'Other Charges'}</span>
                <span className="font-mono text-gray-900 dark:text-white">{formatCurrency(form.otherCharges)}</span>
              </div>
            )}
            {form.tcsApplicable && (
              <div className="flex justify-between px-4 py-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400">TCS ({form.tcsPercent}%)</span>
                <span className="font-mono text-orange-600 dark:text-orange-400">{formatCurrency(calc.tcsAmt)}</span>
              </div>
            )}
            {calc.roundOff !== 0 && (
              <div className="flex justify-between px-4 py-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400">Round Off</span>
                <span className="font-mono text-gray-500">{calc.roundOff > 0 ? '+' : ''}{calc.roundOff}</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-3 bg-blue-50 dark:bg-blue-500/10">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Total Payable</span>
              <span className="text-xl font-display font-bold text-blue-600 dark:text-blue-400">{formatCurrency(calc.total)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={() => navigate('/purchases')}>Cancel</Button>
          <Button type="submit" loading={loading}>{isEdit ? 'Save Changes' : 'Create Purchase'}</Button>
        </div>
      </form>
    </div>
  );
}