import axios from 'axios';
import ExcelJS from 'exceljs';
import fileSaver from 'file-saver';
const saveAs = fileSaver.saveAs || fileSaver;

export const BRANCH_CONFIGS = [
  {
    id: 'man',
    name: 'Mandaue City',
    shortName: 'Mandaue',
    baseUrl: 'https://stl-mandaue-api.com/api/accountant',
    idParam: '2',
    token: 'Bearer 3670|1Q5zbXZYKfjTcftKMKuz0oAtJXMwaeIZT0LI73fa',
    color: '#06b6d4',
    badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
  },
  {
    id: 'mag',
    name: 'Maguindanao',
    shortName: 'Maguindanao',
    baseUrl: 'https://stl-mag-api.com/api/accountant',
    idParam: '2',
    token: 'Bearer 142375|bgm3cNBv4knCMImS9OLYFiMr7mIV7aDirkb0msqH',
    color: '#10b981',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  },
  {
    id: 'imp',
    name: 'Imperial (Cotabato)',
    shortName: 'Imperial',
    baseUrl: 'https://stl-cotabato-api.com/api/accountant',
    idParam: '2',
    token: 'Bearer 56330|qagnV8cXj50qLK2xxMCorZ5QTTjrHls9Get3xxxA',
    color: '#f59e0b',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  },
  {
    id: 'lds',
    name: 'LDS',
    shortName: 'LDS',
    baseUrl: 'https://stl-lds-api.com/api/accountant',
    idParam: '1',
    token: 'Bearer 111012|Ag4bzY0DBPYHbQsl8QxhqpdURrT6LYmsWnQsLEif',
    color: '#8b5cf6',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  },
  {
    id: 'setb',
    name: 'SETB',
    shortName: 'SETB',
    baseUrl: 'https://stl-ldn-api.com/api/accountant',
    idParam: '7',
    token: 'Bearer 52234|Onnl7X9xpobG8aCWc9ljH7myoRBSmjBkuShdmoSS',
    color: '#3b82f6',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  },
  {
    id: 'iligan',
    name: 'Iligan',
    shortName: 'Iligan',
    baseUrl: 'https://stl-ldn-api.com/api/accountant',
    idParam: '5',
    token: 'Bearer 52377|5JOEAHdiBRMXs77YYV0DYsShdGQ4l1XH5LOpGOWj',
    color: '#14b8a6',
    badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/20'
  },
  {
    id: 'lanao',
    name: 'Lanao',
    shortName: 'Lanao',
    baseUrl: 'https://stl-ldn-api.com/api/accountant',
    idParam: '2',
    token: 'Bearer 52379|ET5cJogQqR4LuBPMZoFBDQWbNMLGZKjogWQXX0AV',
    color: '#a855f7',
    badgeClass: 'bg-violet-500/10 text-violet-400 border-violet-500/20'
  },
  {
    id: 'baloi',
    name: 'Baloi',
    shortName: 'Baloi',
    baseUrl: 'https://stl-ldn-api.com/api/accountant',
    idParam: '6',
    token: 'Bearer 52382|TbvbjynEw9xiusXbvQ1ZG7iTZyQPdK0vCaZvhdN2',
    color: '#f97316',
    badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
  },
  {
    id: 'lotto',
    name: 'Lotto',
    shortName: 'Lotto',
    baseUrl: 'https://stl-ldn-api.com/api/accountant',
    idParam: '8',
    token: 'Bearer 52381|Uuxa0i0M6AeysXHd5z11G2K4AsCiaDD0h7B3YdD8',
    color: '#ec4899',
    badgeClass: 'bg-pink-500/10 text-pink-400 border-pink-500/20'
  }
];

export const formatCurrency = (val, includeSign = false) => {
  if (val === null || val === undefined || isNaN(val)) return '₱0';
  const num = Number(val);
  const formatted = Math.abs(num).toLocaleString('en-US');
  if (includeSign) {
    if (num > 0) return `+₱${formatted}`;
    if (num < 0) return `-₱${formatted}`;
    return `₱${formatted}`;
  }
  return num < 0 ? `-₱${formatted}` : `₱${formatted}`;
};

export const formatPercent = (val, includeSign = false) => {
  if (val === null || val === undefined || isNaN(val)) return '0.00%';
  const num = Number(val);
  const formatted = `${Math.abs(num).toFixed(2)}%`;
  if (includeSign) {
    if (num > 0) return `+${formatted}`;
    if (num < 0) return `-${formatted}`;
    return formatted;
  }
  return num < 0 ? `-${formatted}` : formatted;
};

export const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[parseInt(m, 10) - 1] || m;
  return `${monthName} ${parseInt(d, 10)}, ${y}`;
};

export const formatDateHeader = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [, m, d] = parts;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[parseInt(m, 10) - 1] || m;
  return `${monthName} ${parseInt(d, 10)}`;
};

/**
 * Extracts item sortable date string YYYY-MM-DD
 */
export const getItemDateStr = (item) => {
  if (!item || !item.drawYear || !item.drawMonth || !item.drawDay) return null;
  return `${item.drawYear}-${String(item.drawMonth).padStart(2, '0')}-${String(item.drawDay).padStart(2, '0')}`;
};

/**
 * Computes comparative metrics between date1 and date2
 */
export const calculateComparisonMetrics = (recordsDate1, recordsDate2) => {
  const g1 = (recordsDate1 || []).reduce((acc, curr) => acc + (Number(curr.TotalOverAllGross) || 0), 0);
  const h1 = (recordsDate1 || []).reduce((acc, curr) => acc + (Number(curr.TotalOverAllHits) || 0), 0);
  const p1 = g1 - h1;
  const hitRate1 = g1 > 0 ? (h1 / g1) * 100 : 0;

  const g2 = (recordsDate2 || []).reduce((acc, curr) => acc + (Number(curr.TotalOverAllGross) || 0), 0);
  const h2 = (recordsDate2 || []).reduce((acc, curr) => acc + (Number(curr.TotalOverAllHits) || 0), 0);
  const p2 = g2 - h2;
  const hitRate2 = g2 > 0 ? (h2 / g2) * 100 : 0;

  const diffG = g2 - g1;
  const diffH = h2 - h1;
  const diffP = p2 - p1;

  const pctG = g1 === 0 ? (g2 > 0 ? 100 : 0) : (diffG / g1) * 100;
  const pctH = h1 === 0 ? (h2 > 0 ? 100 : 0) : (diffH / h1) * 100;
  const pctP = p1 === 0 ? (p2 > 0 ? 100 : 0) : (diffP / Math.abs(p1)) * 100;

  return {
    date1: { gross: g1, hits: h1, profit: p1, hitRate: hitRate1 },
    date2: { gross: g2, hits: h2, profit: p2, hitRate: hitRate2 },
    change: { gross: diffG, hits: diffH, profit: diffP },
    changePct: { gross: pctG, hits: pctH, profit: pctP }
  };
};

/**
 * Generates an executive narrative assessment mirroring the screenshot
 */
export const generateExecutiveAssessment = (metrics, branchName, date2Str) => {
  const { date1, date2, change, changePct } = metrics;
  const targetDateName = formatDateHeader(date2Str);

  const grossDir = change.gross >= 0 ? 'increased' : 'decreased';
  const profitDir = change.profit >= 0 ? 'increased' : 'decreased';
  const absPctG = Math.abs(changePct.gross).toFixed(2);
  const absPctP = Math.abs(changePct.profit).toFixed(2);
  const absPctH = Math.abs(changePct.hits).toFixed(2);

  // Critical warning if deficit
  if (date2.profit < 0) {
    return {
      severity: 'critical',
      badge: 'Deficit Warning',
      badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      text: `Critical Alert: Hits surged by ${changePct.hits >= 0 ? '+' : ''}${absPctH}% (${formatCurrency(change.hits, true)}), driving payout ratio to ${date2.hitRate.toFixed(2)}% (hits exceeded gross sales). Consequently, net kabig/profit dropped by ${formatCurrency(change.profit, true)} into a net loss of ${formatCurrency(date2.profit)}. Immediate ticket payout verification recommended.`
    };
  }

  // High hits eroding profit despite gross sales increasing
  if (change.gross > 0 && change.hits > 0 && change.profit < 0) {
    return {
      severity: 'warning',
      badge: 'Margin Compression',
      badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      text: `Gross sales increased by approximately ${absPctG}% on ${targetDateName}, but hits increased at a faster rate (+${absPctH}%). As a result, the recorded kabig/profit decreased by approximately ${formatCurrency(Math.abs(change.profit))}, or ${absPctP}%. This indicates that higher sales did not translate into higher recorded profit.`
    };
  }

  // Strong profit expansion with reduced hits
  if (change.profit > 0 && change.hits <= 0) {
    return {
      severity: 'success',
      badge: 'Strong Profit Expansion',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      text: `Gross sales ${grossDir} by approximately ${absPctG}% on ${targetDateName}. Accompanied by a decrease in hits (-${absPctH}% / ${formatCurrency(Math.abs(change.hits))}), recorded kabig/profit surged by approximately ${formatCurrency(change.profit, true)} (+${absPctP}%). This reflects exceptional profitability with a controlled hit rate of ${date2.hitRate.toFixed(2)}%.`
    };
  }

  // Both gross and profit increased
  if (change.profit > 0 && change.gross > 0) {
    return {
      severity: 'success',
      badge: 'Profitable Growth',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      text: `Gross sales increased by approximately ${absPctG}% (+${formatCurrency(change.gross)}) on ${targetDateName}. Revenue expansion outpaced hits claims, delivering an increase in final kabig/profit of ${formatCurrency(change.profit, true)} (+${absPctP}%) with a healthy hit rate of ${date2.hitRate.toFixed(2)}%.`
    };
  }

  // Default general assessment
  return {
    severity: 'neutral',
    badge: 'Neutral Shift',
    badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    text: `Gross sales ${grossDir} by approximately ${absPctG}% (${formatCurrency(change.gross, true)}) on ${targetDateName}. Net recorded kabig/profit ${profitDir} by ${formatCurrency(Math.abs(change.profit))} (${absPctP}%), with a hit payout ratio of ${date2.hitRate.toFixed(2)}%.`
  };
};

/**
 * Fetch daily records for a single branch across a date range
 */
export const fetchBranchDailyData = async (branchConfig, fromDateStr, toDateStr) => {
  const url = `${branchConfig.baseUrl}/TellerGrossPerDateRange?id=${branchConfig.idParam}&from=${fromDateStr}&to=${toDateStr}`;
  const res = await axios.get(url, {
    headers: { Authorization: branchConfig.token }
  });
  return res.data?.data || [];
};

/**
 * Export full comparative analysis report to Excel
 */
export const exportDailyAnalysisExcel = async (branchResults, consolidatedMetrics, date1Str, date2Str) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SGC STL Management System';
  workbook.lastModifiedBy = 'Daily Sales Analysis';
  workbook.created = new Date();

  const d1Header = formatDateHeader(date1Str);
  const d2Header = formatDateHeader(date2Str);

  const sheet = workbook.addWorksheet('Daily Performance Analysis', {
    views: [{ showGridLines: true }]
  });

  // Title Block
  sheet.mergeCells('A1:G1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `DAILY SALES ANALYSIS REPORT (${d1Header.toUpperCase()} vs ${d2Header.toUpperCase()})`;
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  sheet.getRow(1).height = 36;

  sheet.mergeCells('A2:G2');
  const subCell = sheet.getCell('A2');
  subCell.value = `Generated on ${new Date().toLocaleString()} | Source: System Sales Monitoring Sheet`;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF94A3B8' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  sheet.getRow(2).height = 20;

  // Header Row
  const headers = [
    'BRANCH',
    `${d1Header} GROSS`,
    `${d2Header} GROSS`,
    'CHANGE GROSS',
    `${d1Header} HITS`,
    `${d2Header} HITS`,
    'CHANGE HITS',
    `${d1Header} KABIG/PROFIT`,
    `${d2Header} KABIG/PROFIT`,
    'CHANGE KABIG',
    '% CHG KABIG'
  ];

  sheet.getRow(4).values = headers;
  const headerRow = sheet.getRow(4);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  let rowIndex = 5;
  branchResults.forEach((branch) => {
    const m = branch.metrics;
    const row = sheet.getRow(rowIndex);
    row.values = [
      branch.name,
      m.date1.gross,
      m.date2.gross,
      m.change.gross,
      m.date1.hits,
      m.date2.hits,
      m.change.hits,
      m.date1.profit,
      m.date2.profit,
      m.change.profit,
      m.changePct.profit / 100
    ];

    row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(1).font = { bold: true };

    for (let col = 2; col <= 10; col++) {
      const c = row.getCell(col);
      c.numFmt = '₱#,##0;[Red](₱#,##0);"-"';
      c.alignment = { horizontal: 'right', vertical: 'middle' };
    }
    const pctCell = row.getCell(11);
    pctCell.numFmt = '+0.00%;-0.00%;0.00%';
    pctCell.alignment = { horizontal: 'right', vertical: 'middle' };
    pctCell.font = { bold: true, color: { argb: m.change.profit >= 0 ? 'FF16A34A' : 'FFDC2626' } };

    rowIndex++;
  });

  // Consolidated Total Row
  const totalRow = sheet.getRow(rowIndex);
  const cm = consolidatedMetrics;
  totalRow.values = [
    'CONSOLIDATED TOTAL',
    cm.date1.gross,
    cm.date2.gross,
    cm.change.gross,
    cm.date1.hits,
    cm.date2.hits,
    cm.change.hits,
    cm.date1.profit,
    cm.date2.profit,
    cm.change.profit,
    cm.changePct.profit / 100
  ];
  totalRow.height = 26;
  totalRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    if (colNumber === 1) {
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    } else if (colNumber === 11) {
      cell.numFmt = '+0.00%;-0.00%;0.00%';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    } else {
      cell.numFmt = '₱#,##0;[Red](₱#,##0);"-"';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }
  });

  // Auto width columns
  sheet.columns = [
    { width: 24 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 20 },
    { width: 20 },
    { width: 18 },
    { width: 16 }
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `Daily_Sales_Analysis_${date1Str}_vs_${date2Str}.xlsx`;
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
};
