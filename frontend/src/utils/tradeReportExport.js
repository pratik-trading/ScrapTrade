// Builds the Excel / PDF files for the party trade report.
// Both functions return a Blob; the caller triggers the download.

export const dmy = d => (d ? new Date(d).toLocaleDateString('en-GB') : '');
export const inr = n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const qty = n => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
export const weightTotals = s =>
  Object.entries(s.weightByUnit || {}).map(([u, w]) => `${qty(w)} ${u}`).join(' + ') || '0';

const titleOf = meta => `${meta.type === 'sale' ? 'Sales' : 'Purchase'} Trade Report – ${meta.partyName}`;

// ───────────────────────── Excel ─────────────────────────
export async function buildExcel({ data, meta }) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Trades', { views: [{ state: 'frozen', ySplit: 5 }] });

  const thin = { style: 'thin', color: { argb: 'FFD1D5DB' } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  ws.addRow([titleOf(meta)]).font = { bold: true, size: 14 };
  ws.addRow([`Period: ${meta.period}`]);
  const p = data.party || {};
  ws.addRow([[p.mobile && `Mobile: ${p.mobile}`, p.gstNumber && `GSTIN: ${p.gstNumber}`].filter(Boolean).join('   ')]);
  ws.addRow([]);
  const head = ws.addRow(['Date', 'Invoice No', 'Material', 'Weight', 'Unit', 'Rate', 'Amount', 'GST', 'TCS / Other', 'Bill Total']);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.alignment = { vertical: 'middle', horizontal: 'center' };
  head.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }; c.border = border; });

  const first = head.number + 1;
  data.bills.forEach((b, bi) => {
    const start = ws.rowCount + 1;
    b.lines.forEach((l, i) => {
      const row = ws.addRow([
        i === 0 ? new Date(b.billDate) : null,
        i === 0 ? b.billNumber : null,
        l.material, l.weight, l.unit, l.rate, l.amount,
        i === 0 ? b.gst : null, i === 0 ? b.other : null, i === 0 ? b.total : null,
      ]);
      row.eachCell({ includeEmpty: true }, c => {
        c.border = border;
        if (bi % 2) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      });
    });
    const end = ws.rowCount;
    if (end > start) {
      // one invoice = one merged block for the invoice-level columns
      ['A', 'B', 'H', 'I', 'J'].forEach(col => ws.mergeCells(`${col}${start}:${col}${end}`));
    }
    ['A', 'B', 'H', 'I', 'J'].forEach(col => {
      ws.getCell(`${col}${start}`).alignment = { vertical: 'middle', horizontal: col === 'A' || col === 'B' ? 'left' : 'right' };
    });
  });

  const last = ws.rowCount;
  const t = ws.addRow([
    'TOTAL', '', `${data.count} invoices`, null, '', '',
    { formula: `SUM(G${first}:G${last})`, result: data.summary.amount },
    { formula: `SUM(H${first}:H${last})`, result: data.summary.gst },
    { formula: `SUM(I${first}:I${last})`, result: data.summary.other },
    { formula: `SUM(J${first}:J${last})`, result: data.summary.total },
  ]);
  t.font = { bold: true };
  t.eachCell({ includeEmpty: true }, c => {
    c.border = border;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
  });
  ws.addRow([]);
  ws.addRow([`Total weight: ${weightTotals(data.summary)}`]).font = { bold: true };

  ws.getColumn(1).numFmt = 'dd/mm/yyyy';
  ws.getColumn(4).numFmt = '#,##0.000';
  [6, 7, 8, 9, 10].forEach(c => { ws.getColumn(c).numFmt = '#,##0.00'; });
  [13, 16, 28, 12, 8, 12, 16, 14, 14, 16].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ───────────────────────── PDF ─────────────────────────
export async function buildPdf({ data, meta }) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36;

  // Header block (first page only)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text(titleOf(meta), M, 40);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(90);
  const p = data.party || {};
  const sub = [`Period: ${meta.period}`, p.mobile && `Mobile: ${p.mobile}`, p.gstNumber && `GSTIN: ${p.gstNumber}`].filter(Boolean).join('     ');
  doc.text(sub, M, 57);
  doc.text(`Invoices: ${data.count}     Total weight: ${weightTotals(data.summary)}`, M, 71);
  doc.setTextColor(0);

  // Body: invoice-level cells span all material lines of that invoice
  const body = [];
  data.bills.forEach((b, bi) => {
    const fill = bi % 2 ? [243, 244, 246] : [255, 255, 255];
    const n = b.lines.length;
    const cell = (content, o = {}) => ({ content, rowSpan: o.span, styles: { fillColor: fill, halign: o.halign || 'left', valign: o.span ? 'middle' : 'top', fontStyle: o.bold ? 'bold' : 'normal' } });
    b.lines.forEach((l, i) => {
      const row = [];
      if (i === 0) row.push(cell(dmy(b.billDate), { span: n }), cell(b.billNumber, { span: n, bold: true }));
      row.push(
        cell(l.material),
        cell(`${qty(l.weight)} ${l.unit}`, { halign: 'right' }),
        cell(inr(l.rate), { halign: 'right' }),
        cell(inr(l.amount), { halign: 'right' }),
      );
      if (i === 0) row.push(
        cell(inr(b.gst), { span: n, halign: 'right' }),
        cell(inr(b.other), { span: n, halign: 'right' }),
        cell(inr(b.total), { span: n, halign: 'right', bold: true }),
      );
      body.push(row);
    });
  });

  // jsPDF's built-in fonts have no ₹ glyph, so "Rs." is used in the PDF
  const right = { halign: 'right' };
  autoTable(doc, {
    startY: 82,
    margin: { left: M, right: M, top: 40, bottom: 36 },
    head: [['Date', 'Invoice No', 'Material', 'Weight', 'Rate (Rs.)', 'Amount (Rs.)', 'GST (Rs.)', 'Other (Rs.)', 'Bill Total (Rs.)']
      .map((h, i) => ({ content: h, styles: { halign: i >= 3 ? 'right' : 'left' } }))],
    body,
    foot: [[
      { content: 'TOTAL', colSpan: 3, styles: { halign: 'left' } },
      { content: weightTotals(data.summary), styles: right }, '',
      { content: inr(data.summary.amount), styles: right },
      { content: inr(data.summary.gst), styles: right },
      { content: inr(data.summary.other), styles: right },
      { content: inr(data.summary.total), styles: right },
    ]],
    showFoot: 'lastPage',
    rowPageBreak: 'avoid',            // never split one invoice across two pages
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: { top: 5, bottom: 5, left: 6, right: 6 }, lineColor: [209, 213, 219], lineWidth: 0.4, overflow: 'linebreak' },
    headStyles: { fillColor: [31, 41, 55], textColor: 255, fontStyle: 'bold', valign: 'middle' },
    footStyles: { fillColor: [229, 231, 235], textColor: 20, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 58 }, 1: { cellWidth: 92 }, 2: { cellWidth: 'auto' },
      3: { cellWidth: 82, halign: 'right' }, 4: { cellWidth: 64, halign: 'right' }, 5: { cellWidth: 82, halign: 'right' },
      6: { cellWidth: 70, halign: 'right' }, 7: { cellWidth: 74, halign: 'right' }, 8: { cellWidth: 86, halign: 'right' },
    },
  });

  // Footer on every page: generated date + "Page x of y"
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`Generated on ${dmy(new Date())}`, M, H - 18);
    doc.text(`Page ${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
  return doc.output('blob');
}
