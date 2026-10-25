import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { partyAPI, reportAPI } from '../../services/api';
import { Card, Button, Input, Select, Spinner } from '../../components/ui';
import { getFinancialYearsList } from '../../utils/financialYear';
import { dmy, inr, qty, weightTotals, buildExcel, buildPdf } from '../../utils/tradeReportExport';
import toast from 'react-hot-toast';

const QUARTERS = [
  { value: 'Q1', label: 'Q1 (Apr – Jun)' },
  { value: 'Q2', label: 'Q2 (Jul – Sep)' },
  { value: 'Q3', label: 'Q3 (Oct – Dec)' },
  { value: 'Q4', label: 'Q4 (Jan – Mar)' },
];

const download = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export default function PartyTradeReport() {
  const { financialYear } = useApp();
  const fyList = getFinancialYearsList(2020);

  const [parties, setParties] = useState([]);
  const [type, setType] = useState('purchase');
  const [partyId, setPartyId] = useState('');
  const [mode, setMode] = useState('fy'); // fy | quarter | custom
  const [fy, setFy] = useState(financialYear);
  const [quarter, setQuarter] = useState('Q1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null); // { data, meta }

  useEffect(() => {
    partyAPI.getAll().then(res => setParties(res.data.parties)).catch(() => {});
  }, []);

  const periodLabel = () => {
    if (mode === 'custom') return `${dmy(startDate) || 'Start'} to ${dmy(endDate) || 'Today'}`;
    if (mode === 'quarter') return `FY ${fy} · ${QUARTERS.find(q => q.value === quarter).label}`;
    return `FY ${fy}`;
  };

  const generate = async () => {
    if (!partyId) return toast.error('Select a party');
    if (mode === 'custom' && !startDate && !endDate) return toast.error('Pick a date range');
    const params = { party: partyId, type };
    if (mode === 'custom') {
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
    } else {
      params.financialYear = fy;
      if (mode === 'quarter') params.quarter = quarter;
    }
    setLoading(true);
    try {
      const res = await reportAPI.partyTrades(params);
      const partyName = parties.find(p => p._id === partyId)?.name || res.data.party?.name || 'Party';
      setReport({ data: res.data, meta: { partyName, type, period: periodLabel() } });
      if (!res.data.bills.length) toast('No trades found for this selection');
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const fileBase = () => {
    const { partyName, type: t, period } = report.meta;
    return `${t}-trades_${partyName}_${period}`.replace(/[^\w\-]+/g, '_');
  };

  const exportExcel = async () => download(await buildExcel(report), `${fileBase()}.xlsx`);
  const exportPdf = async () => download(await buildPdf(report), `${fileBase()}.pdf`);

  const safe = fn => async () => {
    try { await fn(); } catch (e) { console.error(e); toast.error('Export failed'); }
  };

  return (
    <Card className="p-6 space-y-5">
      <div>
        <h3 className="font-display font-semibold text-gray-900 dark:text-white">Party Trade Report</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">All trades with one party — date, invoice, material, weight, rate, amount</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Select label="Report For" value={type} onChange={e => { setType(e.target.value); setReport(null); }}>
          <option value="purchase">Purchases (bought from party)</option>
          <option value="sale">Sales (sold to party)</option>
        </Select>
        <Select label="Party" value={partyId} onChange={e => { setPartyId(e.target.value); setReport(null); }}>
          <option value="">Select party…</option>
          {parties.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </Select>
        <Select label="Period" value={mode} onChange={e => setMode(e.target.value)}>
          <option value="fy">Financial Year</option>
          <option value="quarter">Quarter</option>
          <option value="custom">Custom Date Range</option>
        </Select>

        {mode !== 'custom' && (
          <Select label="Financial Year" value={fy} onChange={e => setFy(e.target.value)}>
            {fyList.map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
        )}
        {mode === 'quarter' && (
          <Select label="Quarter" value={quarter} onChange={e => setQuarter(e.target.value)}>
            {QUARTERS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
          </Select>
        )}
        {mode === 'custom' && (
          <>
            <Input label="From Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <Input label="To Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </>
        )}
      </div>

      <Button onClick={generate} disabled={loading}>{loading ? 'Generating…' : 'Generate Report'}</Button>

      {loading && <Spinner />}

      {report && !loading && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">{report.meta.partyName}</span> · {report.meta.period} · {report.data.count} bills · {weightTotals(report.data.summary)}
            </div>
            {report.data.bills.length > 0 && (
              <div className="flex gap-2">
                <Button onClick={safe(exportExcel)}>📥 Excel</Button>
                <Button onClick={safe(exportPdf)}>📄 PDF</Button>
              </div>
            )}
          </div>

          {report.data.bills.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    {['Date', 'Invoice No', 'Material', 'Weight', 'Rate', 'Amount', 'GST', 'TCS/Other', 'Bill Total'].map((h, i) => (
                      <th key={h} className={`py-2 px-3 ${i >= 3 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.data.bills.map(b => b.lines.map((l, i) => {
                    const n = b.lines.length;
                    const cls = 'py-2 px-3 align-middle';
                    return (
                      <tr key={`${b.id}-${i}`} className={`text-gray-700 dark:text-gray-300 ${i === n - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}>
                        {i === 0 && <td rowSpan={n} className={cls}>{dmy(b.billDate)}</td>}
                        {i === 0 && <td rowSpan={n} className={`${cls} font-mono font-medium`}>{b.billNumber}</td>}
                        <td className="py-2 px-3">{l.material}</td>
                        <td className="py-2 px-3 text-right font-mono">{qty(l.weight)} {l.unit}</td>
                        <td className="py-2 px-3 text-right font-mono">{inr(l.rate)}</td>
                        <td className="py-2 px-3 text-right font-mono">{inr(l.amount)}</td>
                        {i === 0 && <td rowSpan={n} className={`${cls} text-right font-mono`}>{inr(b.gst)}</td>}
                        {i === 0 && <td rowSpan={n} className={`${cls} text-right font-mono`}>{inr(b.other)}</td>}
                        {i === 0 && <td rowSpan={n} className={`${cls} text-right font-mono font-semibold`}>{inr(b.total)}</td>}
                      </tr>
                    );
                  }))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold text-gray-900 dark:text-white">
                    <td className="py-2 px-3" colSpan={3}>Total</td>
                    <td className="py-2 px-3 text-right font-mono">{weightTotals(report.data.summary)}</td>
                    <td />
                    <td className="py-2 px-3 text-right font-mono">{inr(report.data.summary.amount)}</td>
                    <td className="py-2 px-3 text-right font-mono">{inr(report.data.summary.gst)}</td>
                    <td className="py-2 px-3 text-right font-mono">{inr(report.data.summary.other)}</td>
                    <td className="py-2 px-3 text-right font-mono">{inr(report.data.summary.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
