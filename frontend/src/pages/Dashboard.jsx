import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { useApp } from '../context/AppContext';
import { dashboardAPI } from '../services/api';
import { StatCard, Spinner, Card } from '../components/ui';
import { formatCurrency } from '../utils/financialYear';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#ec4899'];

const currencyFormatter = (val) => '₹' + (val >= 100000 ? (val / 100000).toFixed(1) + 'L' : val >= 1000 ? (val / 1000).toFixed(0) + 'K' : val);

export default function Dashboard() {
  const { financialYear } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    dashboardAPI.getData({ financialYear })
      .then(res => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [financialYear]);

  if (loading) return <Spinner />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Financial Year: {financialYear}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Purchases" value={formatCurrency(data.totalPurchases)} sub={`${data.purchaseCount} bills`} color="orange" icon="↓" />
        <StatCard label="Total Sales" value={formatCurrency(data.totalSales)} sub={`${data.saleCount} bills`} color="blue" icon="↑" />
        <StatCard label="Payables" value={formatCurrency(data.totalPayables)} sub="To suppliers" color="red" icon="⚠" />
        <StatCard label="Receivables" value={formatCurrency(data.totalReceivables)} sub="From customers" color="green" icon="✓" />
        <StatCard label="Profit" value={formatCurrency(data.profit)} sub="Sales - Purchases" color="purple" icon="₹" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Bar Chart */}
        <Card className="p-5">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Monthly Overview</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthlyData} barSize={8} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tickFormatter={currencyFormatter} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip formatter={(val) => formatCurrency(val)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="purchases" fill="#f97316" radius={[4, 4, 0, 0]} name="Purchases" />
              <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Sales" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><div className="w-3 h-3 bg-orange-500 rounded-sm" /> Purchases</div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><div className="w-3 h-3 bg-blue-500 rounded-sm" /> Sales</div>
          </div>
        </Card>

        {/* Material wise */}
        <Card className="p-5">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Material-wise Profit</h3>
          {data.materialWise.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.materialWise.slice(0, 8)} layout="vertical" barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis type="number" tickFormatter={currencyFormatter} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis type="category" dataKey="material" tick={{ fontSize: 11, fill: '#6b7280' }} width={70} />
                <Tooltip formatter={(val) => formatCurrency(val)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="profit" fill="#10b981" radius={[0, 4, 4, 0]} name="Profit">
                  {data.materialWise.map((entry, i) => (
                    <Cell key={i} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Parties */}
        <Card className="p-5">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Top 5 Parties</h3>
          {data.top5Parties.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No transactions yet</div>
          ) : (
            <div className="space-y-3">
              {data.top5Parties.map((party, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{party.name}</span>
                      <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{formatCurrency(party.total)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                        style={{ width: `${(party.total / data.top5Parties[0].total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Status summary */}
        <Card className="p-5">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Payment Status Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">Purchases</div>
              {Object.entries(data.purchaseStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status === 'Paid' ? 'bg-green-500' : status === 'Partial' ? 'bg-yellow-500' : status === 'Overdue' ? 'bg-red-500' : 'bg-gray-400'}`} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{status}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-900 dark:text-white font-mono">{count}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">Sales</div>
              {Object.entries(data.saleStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status === 'Paid' ? 'bg-green-500' : status === 'Partial' ? 'bg-yellow-500' : status === 'Overdue' ? 'bg-red-500' : 'bg-gray-400'}`} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{status}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-900 dark:text-white font-mono">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
