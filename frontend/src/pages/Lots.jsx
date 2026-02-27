import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { lotAPI } from '../services/lotAPI';
import { Button, Card, Table, EmptyState, Spinner, ConfirmDialog, Select } from '../components/ui';
import { formatCurrency } from '../utils/financialYear';
import toast from 'react-hot-toast';

const MATERIALS = ['Iron Scrap', 'Steel Scrap', 'Copper', 'Brass', 'Aluminium', 'Stainless Steel', 'MS Scrap', 'Cast Iron', 'Other'];

const LotStatusBadge = ({ status }) => {
  const config = {
    'Fully Sold': 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-500/20',
    'Partial': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20',
    'Unsold': 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400 border border-gray-200 dark:border-gray-600',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${config[status] || config['Unsold']}`}>{status}</span>;
};

export default function Lots() {
  const { financialYear } = useApp();
  const navigate = useNavigate();
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { financialYear };
    if (statusFilter) params.status = statusFilter;
    if (materialFilter) params.materialType = materialFilter;

    lotAPI.getAll(params)
      .then(res => { if (!cancelled) setLots(res.data.lots); })
      .catch(() => { if (!cancelled) toast.error('Failed to load lots'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [financialYear, statusFilter, materialFilter]);

  const handleDelete = async () => {
    try {
      await lotAPI.delete(deleteId);
      toast.success('Lot deleted');
      setDeleteId(null);
      setLots(prev => prev.filter(l => l._id !== deleteId));
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const totalProfit = lots.reduce((s, l) => s + (l.profit || 0), 0);
  const totalPurchaseCost = lots.reduce((s, l) => s + (l.totalPurchaseCost || 0), 0);
  const totalSaleRevenue = lots.reduce((s, l) => s + (l.totalSaleRevenue || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Lot Mapping</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Map purchases to sales · {financialYear} · {lots.length} lots
          </p>
        </div>
        <Button onClick={() => navigate('/lots/new')}>+ New Lot</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Purchase Cost</div>
          <div className="text-xl font-display font-bold text-orange-600 dark:text-orange-400">{formatCurrency(totalPurchaseCost)}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Sale Revenue</div>
          <div className="text-xl font-display font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalSaleRevenue)}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Profit</div>
          <div className={`text-xl font-display font-bold ${totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(totalProfit)}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="Unsold">Unsold</option>
            <option value="Partial">Partially Sold</option>
            <option value="Fully Sold">Fully Sold</option>
          </Select>
          <Select value={materialFilter} onChange={e => setMaterialFilter(e.target.value)}>
            <option value="">All Materials</option>
            {MATERIALS.map(m => <option key={m}>{m}</option>)}
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? <Spinner /> : lots.length === 0 ? (
          <EmptyState
            title="No lots found"
            description="Create a lot to map purchase bills to sale bills and track profit"
            action={<Button onClick={() => navigate('/lots/new')}>Create First Lot</Button>}
          />
        ) : (
          <Table headers={[
            'Lot No', 'Material', 'Buys', 'Sells',
            { label: 'Buy Wt.', right: true },
            { label: 'Sell Wt.', right: true },
            { label: 'Wt. Diff', right: true },
            { label: 'Cost', right: true },
            { label: 'Revenue', right: true },
            { label: 'Profit', right: true },
            'Margin', 'Status', 'Actions'
          ]}>
            {lots.map(lot => (
              <tr key={lot._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="py-3 px-4 text-sm font-mono font-medium text-gray-900 dark:text-white">{lot.lotNumber}</td>
                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{lot.materialType}</td>
                <td className="py-3 px-4 text-sm text-center">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs font-bold">
                    {lot.purchases?.length || 0}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-center">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-bold">
                    {lot.sales?.length || 0}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm font-mono text-right text-gray-700 dark:text-gray-300">{lot.totalPurchaseWeight?.toFixed(2)}</td>
                <td className="py-3 px-4 text-sm font-mono text-right text-gray-700 dark:text-gray-300">{lot.totalSaleWeight?.toFixed(2)}</td>
                <td className={`py-3 px-4 text-sm font-mono text-right ${lot.weightDifference < 0 ? 'text-red-500' : lot.weightDifference > 0 ? 'text-green-500' : 'text-gray-400'}`}>
                  {lot.weightDifference > 0 ? '+' : ''}{lot.weightDifference?.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-sm font-mono text-right text-orange-600 dark:text-orange-400">{formatCurrency(lot.totalPurchaseCost)}</td>
                <td className="py-3 px-4 text-sm font-mono text-right text-blue-600 dark:text-blue-400">{formatCurrency(lot.totalSaleRevenue)}</td>
                <td className={`py-3 px-4 text-sm font-mono text-right font-bold ${lot.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(lot.profit)}
                </td>
                <td className="py-3 px-4 text-sm text-center">
                  <span className={`text-xs font-mono font-bold ${lot.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    {lot.profitPercent}%
                  </span>
                </td>
                <td className="py-3 px-4"><LotStatusBadge status={lot.status} /></td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/lots/${lot._id}`)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View</button>
                    <button onClick={() => navigate(`/lots/${lot._id}/edit`)} className="text-xs text-orange-600 dark:text-orange-400 hover:underline">Edit</button>
                    <button onClick={() => setDeleteId(lot._id)} className="text-xs text-red-600 dark:text-red-400 hover:underline">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Lot"
        message="This will delete the lot mapping only. Original purchase and sale bills will NOT be deleted."
      />
    </div>
  );
}