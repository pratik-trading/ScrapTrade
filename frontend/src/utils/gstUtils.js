// Calculate GST breakdown from taxable amount, type and percent
export const calcGST = (taxableAmount, gstType, gstPercent) => {
  const taxable = parseFloat(taxableAmount) || 0;
  const pct = parseFloat(gstPercent) || 0;

  if (!gstType || gstType === 'none' || pct === 0) {
    return {
      taxableAmount: taxable,
      cgstPercent: 0, cgstAmount: 0,
      sgstPercent: 0, sgstAmount: 0,
      igstPercent: 0, igstAmount: 0,
      totalGstAmount: 0,
      totalAmount: taxable,
    };
  }

  const totalGst = parseFloat(((taxable * pct) / 100).toFixed(2));

  if (gstType === 'IGST') {
    return {
      taxableAmount: taxable,
      cgstPercent: 0, cgstAmount: 0,
      sgstPercent: 0, sgstAmount: 0,
      igstPercent: pct, igstAmount: totalGst,
      totalGstAmount: totalGst,
      totalAmount: parseFloat((taxable + totalGst).toFixed(2)),
    };
  }

  if (gstType === 'CGST_SGST') {
    const half = parseFloat((totalGst / 2).toFixed(2));
    return {
      taxableAmount: taxable,
      cgstPercent: pct / 2, cgstAmount: half,
      sgstPercent: pct / 2, sgstAmount: half,
      igstPercent: 0, igstAmount: 0,
      totalGstAmount: totalGst,
      totalAmount: parseFloat((taxable + totalGst).toFixed(2)),
    };
  }

  return { taxableAmount: taxable, totalGstAmount: 0, totalAmount: taxable };
};

export const GST_RATES = [0, 5, 12, 18, 28];