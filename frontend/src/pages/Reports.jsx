import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { reportAPI } from '../services/api';
import { Card, Button, Input, Select } from '../components/ui';
import { getFinancialYearsList } from '../utils/financialYear';
import toast from 'react-hot-toast';

export default function Reports() {
  const { financialYear } = useApp();
  const fyList = getFinancialYearsList(2020);
  const [purchaseParams, setPurchaseParams] = useState({ financialYear, startDate: '', endDate: '' });
  const [saleParams, setSaleParams] = useState({ financialYear, startDate: '', endDate: '' });

  const handleExportPurchases = () => {
    const params = {};
    if (purchaseParams.financialYear) params.financialYear = purchaseParams.financialYear;
    if (purchaseParams.startDate) params.startDate = purchaseParams.startDate;
    if (purchaseParams.endDate) params.endDate = purchaseParams.endDate;
    reportAPI.exportPurchases(params);
    toast.success('Downloading purchases CSV...');
  };

  const handleExportSales = () => {
    const params = {};
    if (saleParams.financialYear) params.financialYear = saleParams.financialYear;
    if (saleParams.startDate) params.startDate = saleParams.startDate;
    if (saleParams.endDate) params.endDate = saleParams.endDate;
    reportAPI.exportSales(params);
    toast.success('Downloading sales CSV...');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Export data to CSV for analysis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Purchases Export */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400 text-lg">↓</div>
            <div>
              <h3 className="font-display font-semibold text-gray-900 dark:text-white">Purchase Report</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Export purchase bills with payment details</p>
            </div>
          </div>
          <div className="space-y-3 mb-5">
            <Select label="Financial Year" value={purchaseParams.financialYear} onChange={e => setPurchaseParams(p => ({ ...p, financialYear: e.target.value }))}>
              <option value="">All Years</option>
              {fyList.map(fy => <option key={fy} value={fy}>{fy}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="From Date" type="date" value={purchaseParams.startDate} onChange={e => setPurchaseParams(p => ({ ...p, startDate: e.target.value }))} />
              <Input label="To Date" type="date" value={purchaseParams.endDate} onChange={e => setPurchaseParams(p => ({ ...p, endDate: e.target.value }))} />
            </div>
          </div>
          <Button onClick={handleExportPurchases} className="w-full">📥 Export Purchases CSV</Button>
        </Card>

        {/* Sales Export */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 text-lg">↑</div>
            <div>
              <h3 className="font-display font-semibold text-gray-900 dark:text-white">Sales Report</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Export sales bills with payment details</p>
            </div>
          </div>
          <div className="space-y-3 mb-5">
            <Select label="Financial Year" value={saleParams.financialYear} onChange={e => setSaleParams(p => ({ ...p, financialYear: e.target.value }))}>
              <option value="">All Years</option>
              {fyList.map(fy => <option key={fy} value={fy}>{fy}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="From Date" type="date" value={saleParams.startDate} onChange={e => setSaleParams(p => ({ ...p, startDate: e.target.value }))} />
              <Input label="To Date" type="date" value={saleParams.endDate} onChange={e => setSaleParams(p => ({ ...p, endDate: e.target.value }))} />
            </div>
          </div>
          <Button onClick={handleExportSales} className="w-full">📥 Export Sales CSV</Button>
        </Card>
      </div>

      {/* Fields Info */}
      <Card className="p-6">
        <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-3">CSV Export Fields</h3>
        <div className="grid grid-cols-2 gap-6 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <div className="font-medium text-gray-900 dark:text-white mb-2">Purchases CSV includes:</div>
            <div className="space-y-1">
              {['Bill Number', 'Party Name', 'Party Mobile', 'GST Number', 'Material Type', 'Weight', 'Rate Per Kg', 'Total Amount', 'Paid Amount', 'Pending Amount', 'Status', 'Bill Date', 'Due Date', 'Financial Year', 'Notes'].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white mb-2">Sales CSV includes:</div>
            <div className="space-y-1">
              {['Bill Number', 'Party Name', 'Party Mobile', 'GST Number', 'Material Type', 'Weight', 'Rate Per Kg', 'Total Amount', 'Paid Amount', 'Pending Amount', 'Status', 'Bill Date', 'Due Date', 'Financial Year', 'Notes'].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
