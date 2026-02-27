/**
 * Returns financial year string for a given date.
 * Indian FY: April 1 to March 31
 * e.g., date in May 2025 → "2025-2026"
 *       date in Jan 2026 → "2025-2026"
 */
const getFinancialYear = (date = new Date()) => {
  const d = new Date(date);
  const month = d.getMonth(); // 0-indexed, April = 3
  const year = d.getFullYear();
  if (month >= 3) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
};

/**
 * Returns current financial year string
 */
const getCurrentFinancialYear = () => getFinancialYear(new Date());

/**
 * Returns start and end dates for a financial year string
 * e.g., "2025-2026" → { start: Date(2025-04-01), end: Date(2026-03-31) }
 */
const getFYDateRange = (fyString) => {
  const [startYear] = fyString.split('-').map(Number);
  return {
    start: new Date(`${startYear}-04-01T00:00:00.000Z`),
    end: new Date(`${startYear + 1}-03-31T23:59:59.999Z`),
  };
};

/**
 * Generate list of financial years from a start year to current
 */
const getFinancialYearsList = (fromYear = 2020) => {
  const currentFY = getCurrentFinancialYear();
  const [currentStart] = currentFY.split('-').map(Number);
  const years = [];
  for (let y = fromYear; y <= currentStart; y++) {
    years.push(`${y}-${y + 1}`);
  }
  return years.reverse();
};

module.exports = { getFinancialYear, getCurrentFinancialYear, getFYDateRange, getFinancialYearsList };
