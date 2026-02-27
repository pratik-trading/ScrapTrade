import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { partyAPI } from '../services/api';
import { Button, Card, Table, Modal, Input, Select, EmptyState, Spinner, ConfirmDialog } from '../components/ui';
import toast from 'react-hot-toast';

const EMPTY_FORM = { name: '', address: '', gstNumber: '', type: 'both' };

export default function Parties() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [editParty, setEditParty] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (typeFilter) params.type = typeFilter;

    partyAPI.getAll(params)
      .then(res => { if (!cancelled) setParties(res.data.parties); })
      .catch(() => { if (!cancelled) toast.error('Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [search, typeFilter]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditParty(null); setModal(true); };
  const openEdit = (p) => {
    setForm({ name: p.name, mobile: p.mobile || '', address: p.address || '', gstNumber: p.gstNumber || '', type: p.type });
    setEditParty(p);
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editParty) {
        const res = await partyAPI.update(editParty._id, form);
        setParties(prev => prev.map(p => p._id === editParty._id ? res.data.party : p));
        toast.success('Party updated');
      } else {
        const res = await partyAPI.create(form);
        setParties(prev => [res.data.party, ...prev]);
        toast.success('Party added');
      }
      setModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await partyAPI.delete(deleteId);
      toast.success('Party deleted');
      setParties(prev => prev.filter(p => p._id !== deleteId));
      setDeleteId(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Parties</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{parties.length} parties</p>
        </div>
        <Button onClick={openAdd}>+ Add Party</Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="supplier">Suppliers</option>
            <option value="customer">Customers</option>
            <option value="both">Both</option>
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? <Spinner /> : parties.length === 0 ? (
          <EmptyState
            title="No parties found"
            description="Add suppliers and customers to manage transactions"
            action={<Button onClick={openAdd}>Add Party</Button>}
          />
        ) : (
          <Table headers={['Name', 'Mobile', 'GST Number', 'Type', 'Actions']}>
            {parties.map(p => (
              <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{p.name}</td>
                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 font-mono">{p.mobile || '—'}</td>
                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 font-mono">{p.gstNumber || '—'}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium
                    ${p.type === 'supplier' ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' :
                      p.type === 'customer' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                      'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400'}`}>
                    {p.type}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <Link to={`/parties/${p._id}/ledger`} className="text-xs text-green-600 dark:text-green-400 hover:underline">Ledger</Link>
                    <button onClick={() => openEdit(p)} className="text-xs text-orange-600 dark:text-orange-400 hover:underline">Edit</button>
                    <button onClick={() => setDeleteId(p._id)} className="text-xs text-red-600 dark:text-red-400 hover:underline">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editParty ? 'Edit Party' : 'Add New Party'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Party name" required />
          <Input label="GST Number" value={form.gstNumber} onChange={e => setForm(p => ({ ...p, gstNumber: e.target.value.toUpperCase() }))} placeholder="22AAAAA0000A1Z5" />
          <Input label="Address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Full address" />
          <Select label="Type" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
            <option value="both">Both (Supplier & Customer)</option>
            <option value="supplier">Supplier</option>
            <option value="customer">Customer</option>
          </Select>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editParty ? 'Save Changes' : 'Add Party'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Party" message="Are you sure? Parties with existing transactions cannot be deleted." />
    </div>
  );
}