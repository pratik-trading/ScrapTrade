import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { saleAPI, partyAPI } from '../services/api';
import { Button, Input, Select, Card } from '../components/ui';
import GSTSection from '../components/ui/GSTSection';
import { calcGST } from '../utils/gstUtils';
import { getFinancialYear, formatCurrency } from '../utils/financialYear';
import toast from 'react-hot-toast';

const MATERIALS = ['Iron Scrap', 'Steel Scrap', 'Copper', 'Brass', 'Aluminium', 'Stainless Steel', 'MS Scrap', 'Cast Iron', 'Other'];

export default function SaleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [form, setForm] = useState({
    billNumber: '',
    party: '',
    materialType: '',
    weight: '',
    weightUnit: 'kg',
    ratePerKg: '',
    taxableAmount: '',
    gstType: 'none',
    gstPercent: 0,
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
          materialType: s.materialType,
          weight: s.weight,
          weightUnit: s.weightUnit,
          ratePerKg: s.ratePerKg,
          taxableAmount: s.taxableAmount,
          gstType: s.gstType || 'none',
          gstPercent: s.gstPercent || 0,
          billDate: s.billDate?.split('T')[0] || '',
          dueDate: s.dueDate?.split('T')[0] || '',
          notes: s.notes || '',
        });
      });
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...form, [name]: value };
    if (name === 'weight' || name === 'ratePerKg') {
      const w = parseFloat(name === 'weight' ? value : updated.weight) || 0;
      const r = parseFloat(name === 'ratePerKg' ? value : updated.ratePerKg) || 0;
      updated.taxableAmount = parseFloat((w * r).toFixed(2));
    }
    setForm(updated);
  };

  const gstCalc = calcGST(form.taxableAmount, form.gstType, form.gstPercent);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
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
          <p className="text-sm text-gray-500 dark:text-gray-400">Financial Year: {getFinancialYear(form.billDate)}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="p-6 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bill Details</h3>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Bill Number *" name="billNumber" value={form.billNumber} onChange={handleChange} placeholder="SAL-001" required />
            <Select label="Party *" name="party" value={form.party} onChange={handleChange} required>
              <option value="">Select Party</option>
              {parties.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Material Type *</label>
              <input
                list="sale-materials"
                name="materialType"
                value={form.materialType}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
                placeholder="Iron Scrap"
                required
              />
              <datalist id="sale-materials">
                {MATERIALS.map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
            <Select label="Weight Unit" name="weightUnit" value={form.weightUnit} onChange={handleChange}>
              <option value="kg">Kg</option>
              <option value="ton">Ton</option>
              <option value="quintal">Quintal</option>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="Weight *" name="weight" type="number" step="0.01" min="0" value={form.weight} onChange={handleChange} placeholder="0.00" required />
            <Input label="Rate / Kg (₹) *" name="ratePerKg" type="number" step="0.01" min="0" value={form.ratePerKg} onChange={handleChange} placeholder="0.00" required />
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Taxable Amount</label>
              <div className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 text-gray-900 dark:text-white font-mono">
                {formatCurrency(form.taxableAmount || 0)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Bill Date *" name="billDate" type="date" value={form.billDate} onChange={handleChange} required />
            <Input label="Due Date" name="dueDate" type="date" value={form.dueDate} onChange={handleChange} />
          </div>
        </Card>

        {/* GST Section */}
        <GSTSection form={form} setForm={setForm} />

        <Card className="p-4 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Other</h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
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

        {/* Final amount */}
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl px-5 py-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Final Bill Amount
            {form.gstType !== 'none' && (
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                (Taxable {formatCurrency(form.taxableAmount)} + GST {formatCurrency(gstCalc.totalGstAmount)})
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