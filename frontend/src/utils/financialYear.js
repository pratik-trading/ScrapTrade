export const getFinancialYear = (date = new Date()) => {
  const d = new Date(date);
  const month = d.getMonth();
  const year = d.getFullYear();
  return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

export const getCurrentFinancialYear = () => getFinancialYear(new Date());

export const getFinancialYearsList = (fromYear = 2020) => {
  const currentFY = getCurrentFinancialYear();
  const [currentStart] = currentFY.split('-').map(Number);
  const years = [];
  for (let y = fromYear; y <= currentStart; y++) {
    years.push(`${y}-${y + 1}`);
  }
  return years.reverse();
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
