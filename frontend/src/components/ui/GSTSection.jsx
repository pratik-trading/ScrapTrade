import React from 'react';
import { calcGST, GST_RATES } from '../../utils/gstUtils';
import { formatCurrency } from '../../utils/financialYear';

export default function GSTSection({ form, setForm }) {
  const { taxableAmount, gstType, gstPercent } = form;
  const gst = calcGST(taxableAmount, gstType, gstPercent);

  const handleGstTypeChange = (type) => {
    setForm(prev => ({ ...prev, gstType: type }));
  };

  const handleGstPercentChange = (pct) => {
    setForm(prev => ({ ...prev, gstPercent: pct }));
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">GST Calculation</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* GST Type */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
            GST Type
          </label>
          <div className="flex gap-2">
            {[
              { value: 'none', label: 'No GST' },
              { value: 'CGST_SGST', label: 'CGST + SGST' },
              { value: 'IGST', label: 'IGST' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleGstTypeChange(opt.value)}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg border transition-all
                  ${gstType === opt.value
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-orange-300 dark:hover:border-orange-700'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* GST Rate - only show if GST type is not none */}
        {gstType !== 'none' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
              GST Rate
            </label>
            <div className="flex gap-2 flex-wrap">
              {GST_RATES.map(rate => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleGstPercentChange(rate)}
                  className={`py-1.5 px-3 text-xs font-medium rounded-lg border transition-all
                    ${parseFloat(gstPercent) === rate
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-orange-300'
                    }`}
                >
                  {rate}%
                </button>
              ))}
              {/* Custom rate input */}
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={gstPercent}
                onChange={e => handleGstPercentChange(e.target.value)}
                className="w-20 py-1.5 px-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-orange-400"
                placeholder="Custom"
              />
            </div>
          </div>
        )}

        {/* GST Breakdown Table */}
        <div className="bg-gray-50 dark:bg-gray-800/30 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <td className="py-2 px-3 text-gray-500 dark:text-gray-400">Taxable Amount</td>
                <td className="py-2 px-3 text-right font-mono text-gray-900 dark:text-white font-medium">
                  {formatCurrency(gst.taxableAmount)}
                </td>
              </tr>

              {gstType === 'CGST_SGST' && (
                <>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400">
                      CGST ({gst.cgstPercent}%)
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-orange-600 dark:text-orange-400">
                      + {formatCurrency(gst.cgstAmount)}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400">
                      SGST ({gst.sgstPercent}%)
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-orange-600 dark:text-orange-400">
                      + {formatCurrency(gst.sgstAmount)}
                    </td>
                  </tr>
                </>
              )}

              {gstType === 'IGST' && (
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-2 px-3 text-gray-500 dark:text-gray-400">
                    IGST ({gst.igstPercent}%)
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-orange-600 dark:text-orange-400">
                    + {formatCurrency(gst.igstAmount)}
                  </td>
                </tr>
              )}

              {gstType !== 'none' && (
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-2 px-3 text-gray-500 dark:text-gray-400">Total GST</td>
                  <td className="py-2 px-3 text-right font-mono text-orange-600 dark:text-orange-400 font-semibold">
                    {formatCurrency(gst.totalGstAmount)}
                  </td>
                </tr>
              )}

              <tr className="bg-orange-50 dark:bg-orange-500/10">
                <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-white">
                  Total Bill Amount
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-lg text-orange-600 dark:text-orange-400">
                  {formatCurrency(gst.totalAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}