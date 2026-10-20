import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Calendar, RefreshCw, Download, BarChart3, TrendingUp, Award,
  Layers, CheckSquare, Square, DollarSign, Activity, ArrowUpRight,
  Copy, Check
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { clsx } from 'clsx';
import { toBlob } from 'html-to-image';

// Helper to copy a DOM element as an image to the clipboard
const copyElementAsImage = async (element, filename = 'chart.png') => {
  if (!element) return false;
  try {
    const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark') || true;
    const options = {
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      pixelRatio: 2,
      cacheBust: true,
      filter: (node) => {
        if (node?.classList && typeof node.classList.contains === 'function') {
          return !node.classList.contains('no-export');
        }
        return true;
      }
    };

    let blob;
    try {
      blob = await toBlob(element, options);
    } catch (fontErr) {
      console.warn('Initial toBlob failed, retrying with skipFonts: true', fontErr);
      blob = await toBlob(element, { ...options, skipFonts: true });
    }

    if (!blob) return false;

    if (navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        return 'copied';
      } catch (clipErr) {
        console.warn('Clipboard write failed, downloading instead:', clipErr);
        saveAs(blob, filename);
        return 'downloaded';
      }
    } else {
      saveAs(blob, filename);
      return 'downloaded';
    }
  } catch (err) {
    console.error('Failed to capture element as image', err);
    return false;
  }
};

// Helper to download element directly as PNG image
const downloadElementAsImage = async (element, filename = 'chart.png') => {
  if (!element) return false;
  try {
    const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark') || true;
    const options = {
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      pixelRatio: 2,
      cacheBust: true,
      filter: (node) => {
        if (node?.classList && typeof node.classList.contains === 'function') {
          return !node.classList.contains('no-export');
        }
        return true;
      }
    };

    let blob;
    try {
      blob = await toBlob(element, options);
    } catch (fontErr) {
      console.warn('Initial toBlob failed, retrying with skipFonts: true', fontErr);
      blob = await toBlob(element, { ...options, skipFonts: true });
    }

    if (blob) {
      saveAs(blob, filename);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to download image', err);
    return false;
  }
};

// LDN Branch Definitions
const BRANCHES = [
  {
    id: 'setb',
    name: 'SETB',
    idParam: '7',
    token: '52234|Onnl7X9xpobG8aCWc9ljH7myoRBSmjBkuShdmoSS',
    color: '#3b82f6', // Bright Blue
    badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  },
  {
    id: 'iligan',
    name: 'Iligan',
    idParam: '5',
    token: '52377|5JOEAHdiBRMXs77YYV0DYsShdGQ4l1XH5LOpGOWj',
    color: '#10b981', // Emerald
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  },
  {
    id: 'lanao',
    name: 'Lanao',
    idParam: '2',
    token: '52379|ET5cJogQqR4LuBPMZoFBDQWbNMLGZKjogWQXX0AV',
    color: '#8b5cf6', // Violet
    badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  },
  {
    id: 'baloi',
    name: 'Baloi',
    idParam: '6',
    token: '52382|TbvbjynEw9xiusXbvQ1ZG7iTZyQPdK0vCaZvhdN2',
    color: '#f59e0b', // Amber
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  },
  {
    id: 'lotto',
    name: 'Lotto',
    idParam: '8',
    token: '52381|Uuxa0i0M6AeysXHd5z11G2K4AsCiaDD0h7B3YdD8',
    color: '#ec4899', // Pink
    badgeBg: 'bg-pink-500/10 text-pink-400 border-pink-500/20'
  }
];

const BASE_URL = 'https://stl-ldn-api.com/api/accountant';

// Helper to format Date objects to YYYY-MM-DD
const formatDateIso = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Custom Tooltip for Master Combined Bar Chart
const MasterChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const totalDayGross = payload.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    return (
      <div className="bg-cardBg/95 backdrop-blur-md p-4 border border-border-divider rounded-xl shadow-2xl min-w-[220px]">
        <div className="flex items-center justify-between border-b border-border-divider pb-2 mb-2">
          <span className="font-bold text-textPrimary text-sm">{label}</span>
          <span className="text-[10px] text-textSecondary uppercase tracking-widest font-semibold">Daily Gross</span>
        </div>
        <div className="space-y-1.5 mb-3">
          {payload.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-textSecondary font-medium">{item.name}:</span>
              </div>
              <span className="font-bold text-textPrimary">₱{Number(item.value).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-border-divider flex justify-between items-center text-xs font-extrabold text-accentGreen">
          <span>Total Combined:</span>
          <span>₱{totalDayGross.toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Single Branch Bar Charts
const BranchChartTooltip = ({ active, payload, label, branchColor }) => {
  if (active && payload && payload.length) {
    const val = Number(payload[0].value) || 0;
    return (
      <div className="bg-cardBg/95 backdrop-blur-md p-3 border border-border-divider rounded-lg shadow-xl text-xs">
        <p className="font-semibold text-textPrimary mb-1">{label}</p>
        <p className="font-bold flex items-center gap-1.5" style={{ color: branchColor }}>
          Gross: <span>₱{val.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

// Memoized Individual Branch Chart Card component for high rendering performance
const BranchChartCard = React.memo(function BranchChartCard({ branch, onCopy, isCopied, setRef }) {
  return (
    <div
      ref={setRef}
      className="glass-card rounded-2xl p-5 border border-border-divider shadow-lg hover:border-slate-600 transition-all flex flex-col justify-between bg-cardBg"
    >
      {/* Branch Header */}
      <div>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: branch.color }} />
              <h4 className="text-base font-extrabold text-textPrimary tracking-tight">
                {branch.name} Branch
              </h4>
            </div>
            <p className="text-[11px] text-textSecondary mt-0.5">
              {branch.percentOfGrand.toFixed(1)}% of total LDN revenue
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onCopy(branch.id, branch.name)}
              className={clsx(
                "p-1.5 rounded-lg border transition-all text-xs font-semibold flex items-center gap-1 no-export",
                isCopied
                  ? "bg-accentGreen text-slate-950 border-accentGreen"
                  : "glass-card text-textSecondary hover:text-textPrimary border-border-divider/50 hover:bg-surface-hover"
              )}
              title={`Copy ${branch.name} chart image to clipboard`}
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Copied</span>
                </>
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${branch.badgeBg}`}>
              ID: {branch.idParam}
            </span>
          </div>
        </div>

        {/* Branch Quick Numbers */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-surface-header/40 border border-border-divider/50 mb-4">
          <div>
            <p className="text-[9px] uppercase font-bold text-textSecondary">Total Gross</p>
            <p className="text-xs font-extrabold text-textPrimary truncate" title={`₱${branch.total.toLocaleString()}`}>
              ₱{branch.total.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase font-bold text-textSecondary">Daily Avg</p>
            <p className="text-xs font-extrabold text-textPrimary truncate" title={`₱${Math.round(branch.dailyAverage).toLocaleString()}`}>
              ₱{Math.round(branch.dailyAverage).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase font-bold text-textSecondary">Peak Day</p>
            <p className="text-xs font-extrabold text-emerald-400 truncate" title={`₱${branch.peakItem.value.toLocaleString()}`}>
              ₱{branch.peakItem.value.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Dedicated Branch Daily Bar Chart */}
      <div className="h-[200px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <BarChart
            data={branch.chartPoints}
            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              width={55}
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `₱${val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : (val / 1000).toFixed(0) + 'K'}`}
            />
            <Tooltip
              content={<BranchChartTooltip branchColor={branch.color} />}
              cursor={{ fill: '#334155', opacity: 0.2 }}
              isAnimationActive={false}
            />
            <Bar
              dataKey="value"
              name={`${branch.name} Daily`}
              fill={branch.color}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Card Footer */}
      <div className="pt-3 border-t border-border-divider/50 flex items-center justify-between text-[11px] text-textSecondary mt-2">
        <span>Peak on {branch.peakItem.name}</span>
        <span className="font-semibold text-textPrimary flex items-center gap-0.5">
          Detailed Stats <ArrowUpRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
});

export default function LdnDailyOverview({ selectedEndDate, setSelectedEndDate }) {
  // Preset ranges matching the dashboard (14-day window: 7 prev vs 7 curr)
  const [rangePreset, setRangePreset] = useState('14d'); // '14d', 'curr7d', 'prev7d', 'custom'

  const computeDates = useCallback((preset, refEndDate) => {
    const end = refEndDate ? new Date(refEndDate) : new Date();
    if (isNaN(end.getTime())) {
      end.setTime(Date.now());
    }
    const start = new Date(end);
    let toDate = new Date(end);

    if (preset === '14d') {
      // 14-day window (identical to dashboard)
      start.setDate(end.getDate() - 13);
    } else if (preset === 'curr7d') {
      // Current 7 days
      start.setDate(end.getDate() - 6);
    } else if (preset === 'prev7d') {
      // Previous 7 days
      start.setDate(end.getDate() - 13);
      toDate.setDate(end.getDate() - 7);
    }
    return {
      from: formatDateIso(start),
      to: formatDateIso(toDate)
    };
  }, []);

  const [dateRange, setDateRange] = useState(() => computeDates('14d', selectedEndDate));

  // Update date range when global selectedEndDate changes if not custom
  useEffect(() => {
    if (rangePreset !== 'custom' && selectedEndDate) {
      const next = computeDates(rangePreset, selectedEndDate);
      setDateRange(prev => {
        if (prev.from === next.from && prev.to === next.to) return prev;
        return next;
      });
    }
  }, [selectedEndDate, rangePreset, computeDates]);

  // View mode for combined bar chart: 'grouped' or 'stacked'
  const [chartMode, setChartMode] = useState('grouped');

  // Active branches on the master chart
  const [visibleBranches, setVisibleBranches] = useState({
    setb: true,
    iligan: true,
    lanao: true,
    baloi: true,
    lotto: true
  });

  // Data state: pre-aggregated daily totals per branch to minimize memory and eliminate lag
  const [branchDailyData, setBranchDailyData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Refs and copy state for image export
  const masterChartRef = useRef(null);
  const branchRefs = useRef({});
  const [copyStatus, setCopyStatus] = useState(null); // null, 'copying', 'copied', 'downloaded'
  const [branchCopyId, setBranchCopyId] = useState(null);

  const handleCopyMasterChart = async () => {
    if (copyStatus === 'copying' || !masterChartRef.current) return;
    setCopyStatus('copying');
    const result = await copyElementAsImage(masterChartRef.current, `LDN_Daily_Gross_Chart_${dateRange.from}_to_${dateRange.to}.png`);
    if (result === 'copied') {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus(null), 2500);
    } else if (result === 'downloaded') {
      setCopyStatus('downloaded');
      setTimeout(() => setCopyStatus(null), 2500);
    } else {
      setCopyStatus(null);
    }
  };

  const handleDownloadMasterChart = async () => {
    if (!masterChartRef.current) return;
    await downloadElementAsImage(masterChartRef.current, `LDN_Daily_Gross_Chart_${dateRange.from}_to_${dateRange.to}.png`);
  };

  const handleCopyBranchChart = useCallback(async (branchId, branchName) => {
    const el = branchRefs.current[branchId];
    if (!el) return;
    setBranchCopyId(branchId);
    await copyElementAsImage(el, `${branchName}_Daily_Gross_Chart.png`);
    setTimeout(() => setBranchCopyId(null), 2500);
  }, []);

  // Toggle branch visibility
  const toggleBranch = (id) => {
    setVisibleBranches(prev => {
      const activeCount = Object.values(prev).filter(Boolean).length;
      if (prev[id] && activeCount === 1) return prev; // Keep at least one branch active
      return { ...prev, [id]: !prev[id] };
    });
  };

  const selectAllBranches = () => {
    setVisibleBranches({
      setb: true,
      iligan: true,
      lanao: true,
      baloi: true,
      lotto: true
    });
  };

  // Fetch data for all 5 branches concurrently with server-side response aggregation
  const fetchAllBranches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const requests = BRANCHES.map(b =>
        axios.get(`${BASE_URL}/TellerGrossPerDateRange?id=${b.idParam}&from=${dateRange.from}&to=${dateRange.to}`, {
          headers: { 'Authorization': `Bearer ${b.token}` }
        }).then(res => {
          // Pre-aggregate daily totals immediately to prevent storing thousands of raw objects
          const daily = {};
          const items = res.data?.data || [];
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.drawMonth || !item.drawDay || !item.drawYear) continue;
            const iso = `${item.drawYear}-${String(item.drawMonth).padStart(2, '0')}-${String(item.drawDay).padStart(2, '0')}`;
            const amount = Number(item.TotalOverAllGross) || 0;
            daily[iso] = (daily[iso] || 0) + amount;
          }
          return {
            branchId: b.id,
            success: true,
            daily
          };
        }).catch(err => ({
          branchId: b.id,
          success: false,
          error: err.message,
          daily: {}
        }))
      );

      const results = await Promise.all(requests);
      const dataMap = {};
      let failureCount = 0;

      results.forEach(res => {
        dataMap[res.branchId] = res.daily;
        if (!res.success) failureCount++;
      });

      setBranchDailyData(dataMap);

      if (failureCount === BRANCHES.length) {
        setError("Unable to connect to LDN API services. Please verify connection and try again.");
      }
    } catch (err) {
      setError(err.message || "Failed to fetch branches data");
    } finally {
      setLoading(false);
    }
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    fetchAllBranches();
  }, [fetchAllBranches]);

  // Aggregate daily gross data from pre-aggregated branch maps (ultra-fast O(N) calculation)
  const aggregated = useMemo(() => {
    const branchTotals = { setb: 0, iligan: 0, lanao: 0, baloi: 0, lotto: 0 };
    const dateMap = {};

    // Continuous date range from dateRange.from to dateRange.to
    const startDate = new Date(dateRange.from);
    const endDate = new Date(dateRange.to);
    const curr = new Date(startDate);

    while (curr <= endDate) {
      const iso = formatDateIso(curr);
      const dayName = curr.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = curr.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      let dayTotal = 0;
      const dayEntry = {
        date: iso,
        name: `${monthDay} (${dayName})`,
        shortName: monthDay,
        dayName: dayName,
        total: 0
      };

      for (let i = 0; i < BRANCHES.length; i++) {
        const bId = BRANCHES[i].id;
        const branchAmount = branchDailyData[bId]?.[iso] || 0;
        dayEntry[bId] = branchAmount;
        dayTotal += branchAmount;
        branchTotals[bId] += branchAmount;
      }

      dayEntry.total = dayTotal;
      dateMap[iso] = dayEntry;
      curr.setDate(curr.getDate() + 1);
    }

    const sortedDates = Object.keys(dateMap).sort().map(iso => dateMap[iso]);
    const grandTotal = Object.values(branchTotals).reduce((a, b) => a + b, 0);

    const branchCharts = BRANCHES.map(b => {
      const chartPoints = sortedDates.map(d => ({
        date: d.date,
        name: d.shortName,
        dayName: d.dayName,
        value: d[b.id] || 0
      }));

      const total = branchTotals[b.id] || 0;
      const daysCount = chartPoints.length || 1;
      const dailyAverage = total / daysCount;
      const peakItem = chartPoints.reduce((max, p) => p.value > max.value ? p : max, chartPoints[0] || { name: 'N/A', value: 0 });
      const percentOfGrand = grandTotal > 0 ? (total / grandTotal) * 100 : 0;

      return {
        ...b,
        total,
        dailyAverage,
        peakItem,
        percentOfGrand,
        chartPoints
      };
    });

    const topBranch = branchCharts.reduce((best, b) => (!best || b.total > best.total ? b : best), null);
    const peakDay = sortedDates.reduce((best, d) => (!best || d.total > best.total ? d : best), null);
    const totalDays = sortedDates.length || 1;
    const combinedDailyAvg = grandTotal / totalDays;

    return {
      dailyList: sortedDates,
      branchTotals,
      grandTotal,
      branchCharts,
      topBranch,
      peakDay,
      combinedDailyAvg
    };
  }, [branchDailyData, dateRange.from, dateRange.to]);

  // Handle Preset Clicks
  const handlePresetChange = (preset) => {
    setRangePreset(preset);
    if (preset !== 'custom') {
      setDateRange(computeDates(preset, selectedEndDate));
    }
  };

  // Export Daily Breakdown to Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('LDN Daily Gross Overview');

      worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Day', key: 'day', width: 10 },
        { header: 'SETB (₱)', key: 'setb', width: 18 },
        { header: 'Iligan (₱)', key: 'iligan', width: 18 },
        { header: 'Lanao (₱)', key: 'lanao', width: 18 },
        { header: 'Baloi (₱)', key: 'baloi', width: 18 },
        { header: 'Lotto (₱)', key: 'lotto', width: 18 },
        { header: 'Daily Total (₱)', key: 'total', width: 22 }
      ];

      // Title rows
      worksheet.spliceRows(1, 0,
        ['LDN BRANCHES DAILY GROSS PERFORMANCE OVERVIEW'],
        [`Date Range: ${dateRange.from} to ${dateRange.to} (SETB, Iligan, Lanao, Baloi, Lotto)`],
        []
      );

      worksheet.mergeCells('A1:H1');
      worksheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };

      worksheet.mergeCells('A2:H2');
      worksheet.getCell('A2').font = { italic: true, size: 11, color: { argb: 'FF64748B' } };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };

      // Header row styling (row 4)
      const headerRow = worksheet.getRow(4);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0F172A' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'medium' },
          right: { style: 'thin' }
        };
      });

      // Data rows
      aggregated.dailyList.forEach(row => {
        const added = worksheet.addRow({
          date: row.date,
          day: row.dayName,
          setb: row.setb,
          iligan: row.iligan,
          lanao: row.lanao,
          baloi: row.baloi,
          lotto: row.lotto,
          total: row.total
        });

        // Numeric currency formatting
        ['setb', 'iligan', 'lanao', 'baloi', 'lotto', 'total'].forEach(col => {
          added.getCell(col).numFmt = '#,##0.00';
          added.getCell(col).alignment = { horizontal: 'right' };
        });
      });

      // Summary Total Row
      const totalsRow = worksheet.addRow({
        date: 'GRAND TOTAL',
        day: `${aggregated.dailyList.length} Days`,
        setb: aggregated.branchTotals.setb,
        iligan: aggregated.branchTotals.iligan,
        lanao: aggregated.branchTotals.lanao,
        baloi: aggregated.branchTotals.baloi,
        lotto: aggregated.branchTotals.lotto,
        total: aggregated.grandTotal
      });

      totalsRow.font = { bold: true };
      totalsRow.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2E8F0' }
        };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'double' }
        };
        if (colNumber >= 3) {
          cell.numFmt = '#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `LDN_Branches_Daily_Gross_${dateRange.from}_to_${dateRange.to}.xlsx`);
    } catch (e) {
      console.error("Export error", e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Top Banner & Control Bar */}
      <div className="glass-card rounded-2xl p-5 border border-border-divider shadow-xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-accentGreen/10 border border-accentGreen/20 text-accentGreen">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-textPrimary">
                  LDN Branches Daily Overview
                </h2>
                <p className="text-xs text-textSecondary">
                  SETB • Iligan • Lanao • Baloi • Lotto — Comparative Daily Gross Analysis
                </p>
              </div>
            </div>
          </div>

          {/* Date Range & Controls */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Presets matching dashboard behavior */}
            <div className="flex glass-panel p-1 rounded-xl border border-border-divider text-xs">
              <button
                onClick={() => handlePresetChange('14d')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  rangePreset === '14d'
                    ? 'bg-accentGreen text-slate-950 shadow-md font-bold'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-surface-hover'
                }`}
                title="14-Day Window (Same as Dashboard Default)"
              >
                14 Days (Dashboard)
              </button>
              <button
                onClick={() => handlePresetChange('curr7d')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  rangePreset === 'curr7d'
                    ? 'bg-accentGreen text-slate-950 shadow-md font-bold'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-surface-hover'
                }`}
                title="Current 7 Days ending at selected date"
              >
                Current 7D
              </button>
              <button
                onClick={() => handlePresetChange('prev7d')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  rangePreset === 'prev7d'
                    ? 'bg-accentGreen text-slate-950 shadow-md font-bold'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-surface-hover'
                }`}
                title="Previous 7 Days prior to current week"
              >
                Previous 7D
              </button>
            </div>

            {/* End Date Picker (Exact match with dashboard) */}
            <div className="relative flex items-center glass-card hover:bg-surface-hover rounded-xl border border-border-divider transition-all focus-within:ring-2 focus-within:ring-accentGreen/50 cursor-pointer text-xs">
              <Calendar className="w-3.5 h-3.5 ml-3 text-textSecondary" />
              <input
                type="date"
                value={selectedEndDate}
                onChange={(e) => {
                  if (setSelectedEndDate) setSelectedEndDate(e.target.value);
                }}
                className="bg-transparent text-textSecondary hover:text-textPrimary px-3 py-1.5 text-xs outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:invert opacity-80 hover:opacity-100 transition-opacity"
                title="Select End Date (Calculates 14 days prior)"
              />
            </div>

            {/* Active Range Display Badge */}
            <div className="px-3 py-1.5 rounded-xl bg-surface-header/60 border border-border-divider text-[11px] font-semibold text-textSecondary flex items-center gap-1.5">
              <span className="text-textPrimary font-bold">{dateRange.from}</span>
              <span>to</span>
              <span className="text-textPrimary font-bold">{dateRange.to}</span>
              <span className="text-accentGreen text-[10px] font-extrabold uppercase ml-1">
                ({rangePreset === '14d' ? '14 Days' : rangePreset === 'curr7d' ? 'Current 7D' : rangePreset === 'prev7d' ? 'Previous 7D' : 'Custom'})
              </span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchAllBranches}
              disabled={loading}
              title="Refresh Data"
              className="p-2.5 rounded-xl glass-card hover:bg-surface-hover border border-border-divider text-textSecondary hover:text-textPrimary transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accentGreen' : ''}`} />
            </button>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              disabled={loading || isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-900 font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Exporting...' : 'Export Excel'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-between text-sm">
          <span>{error}</span>
          <button
            onClick={fetchAllBranches}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg font-bold text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Combined Total Gross */}
        <div className="glass-card rounded-2xl p-5 border border-border-divider relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-accentGreen">
            <DollarSign className="w-24 h-24" />
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-textSecondary">
              Combined Total Gross
            </span>
            <span className="p-2 rounded-xl bg-accentGreen/10 border border-accentGreen/20 text-accentGreen">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-extrabold tracking-tight text-textPrimary">
              ₱{aggregated.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-textSecondary mt-1">
              <span>Across 5 Branches</span>
              <span className="w-1 h-1 rounded-full bg-textSecondary" />
              <span className="text-accentGreen font-semibold">{aggregated.dailyList.length} Days</span>
            </div>
          </div>
        </div>

        {/* Card 2: Average Daily Revenue */}
        <div className="glass-card rounded-2xl p-5 border border-border-divider relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-indigo-400">
            <Activity className="w-24 h-24" />
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-textSecondary">
              Daily Average Gross
            </span>
            <span className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-extrabold tracking-tight text-indigo-400">
              ₱{aggregated.combinedDailyAvg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-textSecondary mt-1">
              Mean daily performance
            </div>
          </div>
        </div>

        {/* Card 3: Top Performing Branch */}
        <div className="glass-card rounded-2xl p-5 border border-border-divider relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-amber-400">
            <Award className="w-24 h-24" />
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-textSecondary">
              Leading Branch
            </span>
            <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl lg:text-3xl font-extrabold tracking-tight text-textPrimary">
                {aggregated.topBranch?.name || '—'}
              </span>
              {aggregated.topBranch && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {aggregated.topBranch.percentOfGrand.toFixed(1)}% Share
                </span>
              )}
            </div>
            <div className="text-xs text-textSecondary mt-1">
              ₱{(aggregated.topBranch?.total || 0).toLocaleString()} period total
            </div>
          </div>
        </div>

        {/* Card 4: Best Single Day */}
        <div className="glass-card rounded-2xl p-5 border border-border-divider relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-emerald-400">
            <TrendingUp className="w-24 h-24" />
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-textSecondary">
              Peak Day Record
            </span>
            <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-extrabold tracking-tight text-emerald-400">
              ₱{(aggregated.peakDay?.total || 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-textSecondary mt-1">
              <span>{aggregated.peakDay?.name || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Share Bar */}
      <div className="glass-card rounded-2xl p-4 border border-border-divider">
        <div className="flex justify-between items-center text-xs font-bold text-textSecondary mb-2">
          <span>BRANCH REVENUE DISTRIBUTION</span>
          <span>100% Total Share</span>
        </div>
        <div className="h-3 w-full bg-surface-header rounded-full overflow-hidden flex">
          {aggregated.branchCharts.map(b => (
            <div
              key={b.id}
              style={{
                width: `${b.percentOfGrand}%`,
                backgroundColor: b.color
              }}
              title={`${b.name}: ${b.percentOfGrand.toFixed(1)}% (₱${b.total.toLocaleString()})`}
              className="h-full transition-all hover:opacity-80 cursor-pointer"
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-xs">
          {aggregated.branchCharts.map(b => (
            <div key={b.id} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
              <span className="font-semibold text-textPrimary">{b.name}:</span>
              <span className="text-textSecondary">{b.percentOfGrand.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* MASTER COMBINED DAILY BAR CHART */}
      <div ref={masterChartRef} className="glass-card rounded-2xl p-6 border border-border-divider relative overflow-hidden shadow-xl bg-cardBg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-accentGreen rounded-full" />
              <h3 className="text-lg font-extrabold tracking-wide text-textPrimary">
                COMPARATIVE DAILY GROSS (ALL 5 BRANCHES)
              </h3>
            </div>
            <p className="text-xs text-textSecondary mt-1">
              Daily revenue comparison across SETB, Iligan, Lanao, Baloi, and Lotto
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 no-export">
            {/* View Switch: Grouped vs Stacked */}
            <div className="flex glass-panel p-1 rounded-xl border border-border-divider text-xs">
              <button
                onClick={() => setChartMode('grouped')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  chartMode === 'grouped'
                    ? 'bg-accentGreen text-slate-950 shadow-md font-bold'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-surface-hover'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Grouped
              </button>
              <button
                onClick={() => setChartMode('stacked')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  chartMode === 'stacked'
                    ? 'bg-accentGreen text-slate-950 shadow-md font-bold'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-surface-hover'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Stacked
              </button>
            </div>

            <button
              onClick={selectAllBranches}
              className="text-xs text-textSecondary hover:text-textPrimary underline transition-colors"
            >
              Select All
            </button>

            {/* Copy Chart Image Button */}
            <button
              onClick={handleCopyMasterChart}
              disabled={copyStatus === 'copying'}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm",
                copyStatus === 'copied'
                  ? "bg-accentGreen text-slate-950 border-accentGreen shadow-accentGreen/20"
                  : copyStatus === 'downloaded'
                  ? "bg-blue-500 text-white border-blue-500"
                  : "glass-card text-textPrimary hover:bg-surface-hover border-border-divider hover:border-accentGreen/50"
              )}
              title="Copy chart image to clipboard (paste anywhere: Telegram, WhatsApp, Messenger, Word, Slides)"
            >
              {copyStatus === 'copying' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-accentGreen" />
                  <span>Copying...</span>
                </>
              ) : copyStatus === 'copied' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : copyStatus === 'downloaded' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved Image!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-accentGreen" />
                  <span>Copy Image</span>
                </>
              )}
            </button>

            {/* Download Chart Image */}
            <button
              onClick={handleDownloadMasterChart}
              className="p-1.5 rounded-xl glass-card hover:bg-surface-hover border border-border-divider text-textSecondary hover:text-textPrimary transition-all"
              title="Download chart image as PNG"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Branch Filters (Interactive Pills) */}
        <div className="flex flex-wrap items-center gap-2 mb-6 no-export">
          <span className="text-xs text-textSecondary font-semibold mr-1">Toggle Branches:</span>
          {BRANCHES.map(b => {
            const isActive = visibleBranches[b.id];
            return (
              <button
                key={b.id}
                onClick={() => toggleBranch(b.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  isActive
                    ? 'glass-card text-textPrimary shadow-sm'
                    : 'opacity-40 hover:opacity-70 bg-transparent border-transparent text-textSecondary'
                }`}
                style={{
                  borderColor: isActive ? b.color : 'transparent'
                }}
              >
                {isActive ? (
                  <CheckSquare className="w-3.5 h-3.5" style={{ color: b.color }} />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                {b.name}
              </button>
            );
          })}
        </div>

        {/* The Master Bar Chart with Debounce and Animation Disabled */}
        <div className="h-[380px] w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center text-textSecondary">
              <RefreshCw className="w-6 h-6 animate-spin text-accentGreen mr-2" />
              Loading comparative branch charts...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <BarChart
                data={aggregated.dailyList}
                margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  width={85}
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₱${val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : (val / 1000).toFixed(0) + 'K'}`}
                  dx={-5}
                />
                <Tooltip
                  content={<MasterChartTooltip />}
                  cursor={{ fill: '#334155', opacity: 0.15 }}
                  isAnimationActive={false}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px', paddingBottom: '12px' }}
                />

                {BRANCHES.filter(b => visibleBranches[b.id]).map(b => (
                  <Bar
                    key={b.id}
                    dataKey={b.id}
                    name={b.name}
                    fill={b.color}
                    stackId={chartMode === 'stacked' ? 'a' : undefined}
                    radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                    maxBarSize={45}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* INDIVIDUAL BRANCH DAILY BAR GRAPHS (5 CARDS GRID) */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
            <h3 className="text-lg font-extrabold tracking-wide text-textPrimary">
              INDIVIDUAL BRANCH DAILY BAR GRAPHS
            </h3>
          </div>
          <span className="text-xs text-textSecondary">
            Dedicated view per branch
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {aggregated.branchCharts.map((branch) => (
            <BranchChartCard
              key={branch.id}
              branch={branch}
              onCopy={handleCopyBranchChart}
              isCopied={branchCopyId === branch.id}
              setRef={el => { branchRefs.current[branch.id] = el; }}
            />
          ))}
        </div>
      </div>

      {/* DAILY PERFORMANCE BREAKDOWN TABLE */}
      <div className="bg-surface rounded-3xl border border-border-divider shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border-divider flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-surface">
          <div>
            <h3 className="text-sm font-extrabold tracking-wide text-textPrimary uppercase">
              Daily Gross Breakdown Table
            </h3>
            <p className="text-xs text-textSecondary mt-0.5">
              Comprehensive daily gross figures for each branch across the active date range
            </p>
          </div>
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-slate-700 text-textPrimary font-semibold text-xs border border-border-divider transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-surface-header/60 border-b border-border-divider text-[10px] text-textSecondary uppercase tracking-widest font-extrabold">
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-4 text-center">Day</th>
                <th className="py-4 px-4 text-right text-blue-400">SETB</th>
                <th className="py-4 px-4 text-right text-emerald-400">Iligan</th>
                <th className="py-4 px-4 text-right text-purple-400">Lanao</th>
                <th className="py-4 px-4 text-right text-amber-400">Baloi</th>
                <th className="py-4 px-4 text-right text-pink-400">Lotto</th>
                <th className="py-4 px-6 text-right text-accentGreen bg-surface-header border-l border-border-divider">
                  Daily Combined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-divider text-xs">
              {aggregated.dailyList.map((row) => (
                <tr key={row.date} className="hover:bg-surface-hover/70 transition-colors">
                  <td className="py-3.5 px-6 font-bold text-textPrimary">{row.date}</td>
                  <td className="py-3.5 px-4 text-center text-textSecondary font-medium">{row.dayName}</td>
                  <td className="py-3.5 px-4 text-right font-semibold text-textSecondary">
                    ₱{row.setb.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-textSecondary">
                    ₱{row.iligan.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-textSecondary">
                    ₱{row.lanao.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-textSecondary">
                    ₱{row.baloi.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-textSecondary">
                    ₱{row.lotto.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-6 text-right font-extrabold text-textPrimary bg-surface-header/30 border-l border-border-divider">
                    ₱{row.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}

              {aggregated.dailyList.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-textSecondary text-sm font-semibold">
                    No data found for the selected date range.
                  </td>
                </tr>
              )}
            </tbody>
            {aggregated.dailyList.length > 0 && (
              <tfoot>
                <tr className="bg-surface-header border-t-2 border-border-divider font-extrabold text-xs">
                  <td className="py-4 px-6 text-textPrimary uppercase">Total ({aggregated.dailyList.length} Days)</td>
                  <td className="py-4 px-4 text-center text-textSecondary">—</td>
                  <td className="py-4 px-4 text-right text-blue-400">
                    ₱{aggregated.branchTotals.setb.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-right text-emerald-400">
                    ₱{aggregated.branchTotals.iligan.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-right text-purple-400">
                    ₱{aggregated.branchTotals.lanao.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-right text-amber-400">
                    ₱{aggregated.branchTotals.baloi.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-right text-pink-400">
                    ₱{aggregated.branchTotals.lotto.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-6 text-right text-accentGreen text-sm bg-surface-header border-l border-border-divider">
                    ₱{aggregated.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
