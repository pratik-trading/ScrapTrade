import React from 'react';
import PartyTradeReport from '../components/reports/PartyTradeReport';

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Party-wise trade reports · download as Excel or PDF</p>
      </div>
      <PartyTradeReport />
    </div>
  );
}