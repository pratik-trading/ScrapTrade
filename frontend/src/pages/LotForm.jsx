import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { lotAPI } from '../services/lotAPI';
import { Button, Input, Select, Card } from '../components/ui';
import toast from 'react-hot-toast';

const MATERIALS = ['Iron Scrap', 'Steel Scrap', 'Copper', 'Brass', 'Aluminium', 'Stainless Steel', 'MS Scrap', 'Cast Iron', 'Other'];

export default function LotForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({ lotNumber: '', materialType: '', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      lotAPI.getOne(id).then(res => {
        const l = res.data.lot;
        setForm({ lotNumber: l.lotNumber, materialType: l.materialType, description: l.description || '' });
      });
    }
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.lotNumber || !form.materialType) return toast.error('Lot number and material type required');
    setLoading(true);
    try {
      if (isEdit) {
        await lotAPI.update(id, form);
        toast.success('Lot updated');
        navigate(`/lots/${id}`);
      } else {
        const res = await lotAPI.create(form);
        toast.success('Lot created! Now link purchase and sale bills.');
        navigate(`/lots/${res.data.lot._id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          {isEdit ? 'Edit Lot' : 'Create New Lot'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isEdit ? 'Update lot details' : 'After creating, you can link purchase and sale bills to this lot'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6 space-y-5">
          <Input
            label="Lot Number *"
            value={form.lotNumber}
            onChange={e => setForm(p => ({ ...p, lotNumber: e.target.value }))}
            placeholder="LOT-001"
            required
          />
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Material Type *
            </label>
            <input
              list="lot-materials"
              value={form.materialType}
              onChange={e => setForm(p => ({ ...p, materialType: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
              placeholder="Iron Scrap"
              required
            />
            <datalist id="lot-materials">
              {MATERIALS.map(m => <option key={m} value={m} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 resize-none"
              placeholder="Optional description for this lot..."
            />
          </div>
        </Card>

        <div className="flex gap-3 mt-4 justify-end">
          <Button type="button" variant="secondary" onClick={() => navigate('/lots')}>Cancel</Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Lot →'}
          </Button>
        </div>
      </form>
    </div>
  );
}