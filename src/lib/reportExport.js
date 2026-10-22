// Download a report as PDF / Excel / Word, or print it.
// rep = { title, columns:[{label,num,money}], rows:[[...]], totals:[...]|null, summary:[[label,value,'money'?]] }
// meta = { farm, farmLine, period, group, shed, by, on }
// The libraries are loaded only when a button is clicked, so the app stays fast.

const inr = (n) => Math.round(Number(n || 0)).toLocaleString('en-IN');
// text for one cell; PDF fonts have no ₹ sign, so PDF uses "Rs."
const cellText = (v, col, rs) => {
  if (v === '' || v === null || v === undefined) return '';
  if (col?.money) return `${rs} ${inr(v)}`;
  if (typeof v === 'number') return v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return String(v);
};
const sumText = (row, rs) => (row[2] === 'money' ? `${rs} ${inr(row[1])}` : String(row[1]));
const fileBase = (rep, meta) => `${rep.title.replace(/[^a-z0-9]+/gi, '-')}_${meta.fromIso}_to_${meta.toIso}`;
const infoLines = (meta) => [
  `Period: ${meta.period}`, `Shown: ${meta.group}${meta.shed ? ` · Shed: ${meta.shed}` : ''}`, `Generated on ${meta.on} by ${meta.by}`
];

function save(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// ---------------- PDF ----------------
export async function downloadPDF(rep, meta) {
  const { jsPDF } = await import('jspdf');
  const { autoTable } = await import('jspdf-autotable');
  const wide = rep.columns.length > 6;
  const doc = new jsPDF({ orientation: wide ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const green = [56, 140, 91];
  doc.setFillColor(...green); doc.rect(0, 0, W, 64, 'F');
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(meta.farm, 40, 30);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(meta.farmLine.replace(/·/g, '|'), 40, 46);
  doc.setTextColor(23, 75, 53); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(rep.title, 40, 92);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90);
  infoLines(meta).forEach((l, i) => doc.text(l.replace(/·/g, '|'), 40, 108 + i * 12));
  autoTable(doc, {
    startY: 148, theme: 'grid', margin: { left: 40, right: 40 }, tableWidth: 300,
    head: [['Summary', '']], body: rep.summary.map((s) => [s[0], sumText(s, 'Rs.')]),
    headStyles: { fillColor: [232, 242, 216], textColor: [23, 75, 53] }, styles: { fontSize: 9 }, columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
  });
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 16, margin: { left: 40, right: 40 },
    head: [rep.columns.map((c) => c.label)],
    body: rep.rows.map((r) => r.map((v, i) => cellText(v, rep.columns[i], 'Rs.'))),
    foot: rep.totals ? [rep.totals.map((v, i) => cellText(v, rep.columns[i], 'Rs.'))] : undefined,
    headStyles: { fillColor: green }, footStyles: { fillColor: [232, 242, 216], textColor: [23, 75, 53] },
    styles: { fontSize: 8, cellPadding: 4 }, alternateRowStyles: { fillColor: [248, 251, 245] },
    showHead: 'everyPage', showFoot: 'lastPage',
    // numbers right-aligned in header, rows and total row
    didParseCell: (h) => { const c = rep.columns[h.column.index]; if (c && (c.num || c.money)) h.cell.styles.halign = 'right'; },
    didDrawPage: () => {
      const H = doc.internal.pageSize.getHeight();
      doc.setFontSize(8); doc.setTextColor(140);
      doc.text(`${meta.farm} | ${rep.title} | ${meta.period}`, 40, H - 20);
      doc.text(`Page ${doc.getNumberOfPages()}`, W - 80, H - 20);
    }
  });
  if (!rep.rows.length) doc.text('No records in this period.', 40, doc.lastAutoTable.finalY + 20);
  doc.save(`${fileBase(rep, meta)}.pdf`);
}

// ---------------- Excel ----------------
export async function downloadExcel(rep, meta) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const n = rep.columns.length;
  const blank = () => Array(n).fill(null);
  const line = (value, style = {}) => { const r = blank(); r[0] = { value, ...style }; return r; };
  const head = { fontWeight: 'bold', backgroundColor: '#388C5B', color: '#FFFFFF' };
  const cell = (v, col, bold) => {
    if (v === '' || v === null || v === undefined) return null;
    const c = { value: v, ...(bold ? { fontWeight: 'bold', backgroundColor: '#E8F2D8' } : {}) };
    if (typeof v === 'number') c.format = col?.money ? '#,##0' : '#,##0.##';
    return c;
  };
  const data = [
    line(meta.farm, { fontWeight: 'bold', fontSize: 14 }), line(meta.farmLine),
    line(rep.title, { fontWeight: 'bold', fontSize: 12 }), ...infoLines(meta).map((l) => line(l)), blank(),
    line('Summary', { fontWeight: 'bold' }),
    ...rep.summary.map((s) => { const r = blank(); r[0] = { value: s[0] }; r[1] = typeof s[1] === 'number' ? { value: s[1], format: '#,##0', fontWeight: 'bold' } : { value: String(s[1]), fontWeight: 'bold' }; return r; }),
    blank(),
    rep.columns.map((c) => ({ value: c.label, ...head })),
    ...rep.rows.map((r) => r.map((v, i) => cell(v, rep.columns[i]))),
    ...(rep.totals ? [rep.totals.map((v, i) => cell(v, rep.columns[i], true) || { value: '', fontWeight: 'bold', backgroundColor: '#E8F2D8' })] : [])
  ];
  const columns = rep.columns.map((c, i) => ({ width: i === 0 ? 26 : c.num || c.money ? 14 : 22 }));
  await writeExcelFile(data, { columns, sheet: rep.title.slice(0, 30) }).toFile(`${fileBase(rep, meta)}.xlsx`);
}

// ---------------- Word ----------------
export async function downloadWord(rep, meta) {
  const d = await import('docx');
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ShadingType, PageOrientation, HeadingLevel } = d;
  const wide = rep.columns.length > 6;
  const p = (text, opts = {}) => new Paragraph({ children: [new TextRun({ text, ...opts })], spacing: { after: 60 } });
  const tc = (text, { bold, fill, color, right } = {}) => new TableCell({
    children: [new Paragraph({ alignment: right ? AlignmentType.RIGHT : AlignmentType.LEFT, children: [new TextRun({ text, bold, color, size: 18 })] })],
    shading: fill ? { type: ShadingType.CLEAR, color: 'auto', fill } : undefined, margins: { top: 40, bottom: 40, left: 80, right: 80 }
  });
  const right = (i) => rep.columns[i].num || rep.columns[i].money;
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: rep.columns.map((c, i) => tc(c.label, { bold: true, fill: '388C5B', color: 'FFFFFF', right: right(i) })) }),
      ...rep.rows.map((r) => new TableRow({ children: r.map((v, i) => tc(cellText(v, rep.columns[i], '₹'), { right: right(i) })) })),
      ...(rep.totals ? [new TableRow({ children: rep.totals.map((v, i) => tc(cellText(v, rep.columns[i], '₹'), { bold: true, fill: 'E8F2D8', right: right(i) })) })] : [])
    ]
  });
  const summary = new Table({
    width: { size: 50, type: WidthType.PERCENTAGE },
    rows: rep.summary.map((s) => new TableRow({ children: [tc(s[0]), tc(sumText(s, '₹'), { bold: true, right: true })] }))
  });
  const doc = new Document({
    sections: [{
      properties: { page: { size: { orientation: wide ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT } } },
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: meta.farm, color: '174B35' })] }),
        p(meta.farmLine, { color: '6B7A72' }),
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: rep.title, color: '388C5B' })] }),
        ...infoLines(meta).map((l) => p(l, { size: 18 })),
        p(''), p('Summary', { bold: true }), summary, p(''),
        rep.rows.length ? table : p('No records in this period.')
      ]
    }]
  });
  save(await Packer.toBlob(doc), `${fileBase(rep, meta)}.docx`);
}

// ---------------- Print ----------------
export function printReport(rep, meta) {
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const td = (v, i, tag = 'td') => `<${tag} class="${rep.columns[i].num || rep.columns[i].money ? 'n' : ''}">${esc(cellText(v, rep.columns[i], '₹'))}</${tag}>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(rep.title)}</title><style>
    body{font-family:Arial,sans-serif;color:#1F2D26;margin:24px;font-size:12px}
    .top{background:#388C5B;color:#fff;padding:12px 16px;border-radius:6px}.top b{font-size:18px}
    h2{color:#174B35;margin:16px 0 4px}.muted{color:#6B7A72}
    table{border-collapse:collapse;width:100%;margin-top:10px}th,td{border:1px solid #DCE6D3;padding:5px 7px;text-align:left}
    th{background:#388C5B;color:#fff}.n{text-align:right}tfoot td{background:#E8F2D8;font-weight:bold}
    .sum{width:auto;min-width:320px}.sum td:last-child{text-align:right;font-weight:bold}
    @page{size:${rep.columns.length > 6 ? 'landscape' : 'portrait'};margin:12mm}</style></head><body>
    <div class="top"><b>${esc(meta.farm)}</b><br>${esc(meta.farmLine)}</div>
    <h2>${esc(rep.title)}</h2>${infoLines(meta).map((l) => `<div class="muted">${esc(l)}</div>`).join('')}
    <table class="sum">${rep.summary.map((s) => `<tr><td>${esc(s[0])}</td><td>${esc(sumText(s, '₹'))}</td></tr>`).join('')}</table>
    ${rep.rows.length ? `<table><thead><tr>${rep.columns.map((c) => `<th class="${c.num || c.money ? 'n' : ''}">${esc(c.label)}</th>`).join('')}</tr></thead>
    <tbody>${rep.rows.map((r) => `<tr>${r.map((v, i) => td(v, i)).join('')}</tr>`).join('')}</tbody>
    ${rep.totals ? `<tfoot><tr>${rep.totals.map((v, i) => td(v, i)).join('')}</tr></tfoot>` : ''}</table>` : '<p>No records in this period.</p>'}
    <script>window.onload=function(){window.print()}</script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open(); w.document.write(html); w.document.close();
  return true;
}
