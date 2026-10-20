import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Calendar, RefreshCw, Download, Copy, Check, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Minus, AlertTriangle, ShieldCheck,
  Building2, BarChart3, ChevronRight, FileSpreadsheet, Sparkles, AlertCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { toBlob } from 'html-to-image';
import fileSaver from 'file-saver';
const saveAs = fileSaver.saveAs || fileSaver;
import { clsx } from 'clsx';
import {
  BRANCH_CONFIGS,
  formatCurrency,
  formatPercent,
  formatDateDisplay,
  formatDateHeader,
  getItemDateStr,
  calculateComparisonMetrics,
  generateExecutiveAssessment,
  fetchBranchDailyData,
  exportDailyAnalysisExcel
} from '../utils/dailySalesAnalysis';
import { useAuth } from '../context/AuthContext';

export default function DailySalesAnalysis() {
  const { user } = useAuth();

  // State: Selected date range (defaults to Oct 18 and Oct 19, 2026)
  const [date1, setDate1] = useState('2026-10-18');
  const [date2, setDate2] = useState('2026-10-19');

  // Filter allowed branches based on role
  const allowedBranches = useMemo(() => {
    if (!user || user.username === 'admin' || user.username === 'jcstechsupport') return BRANCH_CONFIGS;
    if (user.username === 'ldn') {
      return BRANCH_CONFIGS.filter(b => ['setb', 'iligan', 'lanao', 'baloi', 'lotto'].includes(b.id));
    }
    if (user.username === 'man' || user.username === 'mandaue') {
      return BRANCH_CONFIGS.filter(b => b.id === 'man');
    }
    if (user.username === 'maguindanao' || user.username === 'striketeam') {
      return BRANCH_CONFIGS.filter(b => b.id === 'mag');
    }
    if (user.username === 'imperial') {
      return BRANCH_CONFIGS.filter(b => b.id === 'imp');
    }
    return BRANCH_CONFIGS;
  }, [user]);

  // Selected Branch tab: 'all' or branch id
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    if (user && user.username !== 'admin' && user.username !== 'jcstechsupport') {
      if (user.username === 'man' || user.username === 'mandaue') return 'man';
      if (user.username === 'maguindanao' || user.username === 'striketeam') return 'mag';
      if (user.username === 'imperial') return 'imp';
      if (user.username === 'ldn') return 'setb';
    }
    return 'man'; // Default to Mandaue City to match user's screenshot
  });

  // Data storage: branchId -> raw records
  const [rawDataByBranch, setRawDataByBranch] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedStatus, setCopiedStatus] = useState(null);
  const [textCopied, setTextCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const reportCardRef = useRef(null);

  // Load branch data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = {};
      await Promise.all(
        allowedBranches.map(async (branch) => {
          try {
            // Find earliest and latest date to fetch range
            const sorted = [date1, date2].sort();
            const records = await fetchBranchDailyData(branch, sorted[0], sorted[1]);
            results[branch.id] = records;
          } catch (err) {
            console.error(`Error loading data for ${branch.name}`, err);
            results[branch.id] = [];
          }
        })
      );
      setRawDataByBranch(results);
    } catch (err) {
      console.error('Failed to load daily sales analysis data', err);
      setError('Failed to fetch data from branch APIs. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  }, [allowedBranches, date1, date2]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute metrics for each branch
  const branchMetricsMap = useMemo(() => {
    const map = {};
    allowedBranches.forEach((b) => {
      const records = rawDataByBranch[b.id] || [];
      const recsDate1 = records.filter(r => getItemDateStr(r) === date1);
      const recsDate2 = records.filter(r => getItemDateStr(r) === date2);
      map[b.id] = {
        branch: b,
        metrics: calculateComparisonMetrics(recsDate1, recsDate2),
        recsCount1: recsDate1.length,
        recsCount2: recsDate2.length
      };
    });
    return map;
  }, [allowedBranches, rawDataByBranch, date1, date2]);

  // Consolidated metrics across all branches
  const consolidatedMetrics = useMemo(() => {
    let g1 = 0, h1 = 0;
    let g2 = 0, h2 = 0;
    Object.values(branchMetricsMap).forEach(({ metrics }) => {
      g1 += metrics.date1.gross;
      h1 += metrics.date1.hits;
      g2 += metrics.date2.gross;
      h2 += metrics.date2.hits;
    });
    const p1 = g1 - h1;
    const p2 = g2 - h2;
    const diffG = g2 - g1;
    const diffH = h2 - h1;
    const diffP = p2 - p1;

    return {
      date1: { gross: g1, hits: h1, profit: p1, hitRate: g1 > 0 ? (h1 / g1) * 100 : 0 },
      date2: { gross: g2, hits: h2, profit: p2, hitRate: g2 > 0 ? (h2 / g2) * 100 : 0 },
      change: { gross: diffG, hits: diffH, profit: diffP },
      changePct: {
        gross: g1 === 0 ? (g2 > 0 ? 100 : 0) : (diffG / g1) * 100,
        hits: h1 === 0 ? (h2 > 0 ? 100 : 0) : (diffH / h1) * 100,
        profit: p1 === 0 ? (p2 > 0 ? 100 : 0) : (diffP / Math.abs(p1)) * 100
      }
    };
  }, [branchMetricsMap]);

  // Current active view data
  const isAll = selectedBranchId === 'all';
  const currentBranch = useMemo(() => {
    return allowedBranches.find(b => b.id === selectedBranchId) || allowedBranches[0] || null;
  }, [allowedBranches, selectedBranchId]);

  const activeMetrics = useMemo(() => {
    if (isAll) return consolidatedMetrics;
    return branchMetricsMap[selectedBranchId]?.metrics || {
      date1: { gross: 0, hits: 0, profit: 0, hitRate: 0 },
      date2: { gross: 0, hits: 0, profit: 0, hitRate: 0 },
      change: { gross: 0, hits: 0, profit: 0 },
      changePct: { gross: 0, hits: 0, profit: 0 }
    };
  }, [isAll, selectedBranchId, consolidatedMetrics, branchMetricsMap]);

  const assessment = useMemo(() => {
    const name = isAll ? 'Consolidated Network' : currentBranch?.name || 'Branch';
    return generateExecutiveAssessment(activeMetrics, name, date2);
  }, [activeMetrics, isAll, currentBranch, date2]);

  // Chart data for current active view
  const chartData = useMemo(() => {
    const d1Name = formatDateHeader(date1);
    const d2Name = formatDateHeader(date2);
    return [
      {
        name: d1Name,
        Gross: activeMetrics.date1.gross,
        Hits: activeMetrics.date1.hits,
        Profit: activeMetrics.date1.profit
      },
      {
        name: d2Name,
        Gross: activeMetrics.date2.gross,
        Hits: activeMetrics.date2.hits,
        Profit: activeMetrics.date2.profit
      }
    ];
  }, [date1, date2, activeMetrics]);

  // Copy as high-res PNG image
  const handleCopyAsImage = async () => {
    if (!reportCardRef.current) return;
    try {
      const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark') || true;
      const options = {
        backgroundColor: isDark ? '#020617' : '#ffffff',
        pixelRatio: 2.5,
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
        blob = await toBlob(reportCardRef.current, options);
      } catch (err) {
        blob = await toBlob(reportCardRef.current, { ...options, skipFonts: true });
      }

      if (!blob) return;

      const filename = `Daily_Sales_Analysis_${isAll ? 'Consolidated' : currentBranch?.shortName}_${date1}_${date2}.png`;

      if (navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setCopiedStatus('copied');
          setTimeout(() => setCopiedStatus(null), 3000);
        } catch (e) {
          saveAs(blob, filename);
          setCopiedStatus('downloaded');
          setTimeout(() => setCopiedStatus(null), 3000);
        }
      } else {
        saveAs(blob, filename);
        setCopiedStatus('downloaded');
        setTimeout(() => setCopiedStatus(null), 3000);
      }
    } catch (err) {
      console.error('Failed to copy image', err);
    }
  };

  // Copy formatted text
  const handleCopyText = () => {
    const branchTitle = isAll ? 'Consolidated All Branches' : currentBranch?.name;
    const d1H = formatDateHeader(date1);
    const d2H = formatDateHeader(date2);
    const text = `Daily Sales Analysis – ${branchTitle}
Based on the sales monitoring sheet for ${d1H}–${d2H}, 2026, the analysis focuses on gross sales performance, hits, kabig/profit, and daily changes.

1. Daily performance summary
Performance indicator | ${d1H} | ${d2H}
Total gross sales | ${formatCurrency(activeMetrics.date1.gross)} | ${formatCurrency(activeMetrics.date2.gross)}
Total hits | ${formatCurrency(activeMetrics.date1.hits)} | ${formatCurrency(activeMetrics.date2.hits)}
Final kabig/profit | ${formatCurrency(activeMetrics.date1.profit)} | ${formatCurrency(activeMetrics.date2.profit)}
Change in gross sales | — | ${formatCurrency(activeMetrics.change.gross, true)}
Change in hits | — | ${formatCurrency(activeMetrics.change.hits, true)}
Change in kabig/profit | — | ${formatCurrency(activeMetrics.change.profit, true)}

${assessment.text}`;

    navigator.clipboard.writeText(text);
    setTextCopied(true);
    setTimeout(() => setTextCopied(false), 2500);
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const branchResults = allowedBranches.map(b => ({
        name: b.name,
        metrics: branchMetricsMap[b.id]?.metrics || {
          date1: { gross: 0, hits: 0, profit: 0 },
          date2: { gross: 0, hits: 0, profit: 0 },
          change: { gross: 0, hits: 0, profit: 0 },
          changePct: { profit: 0 }
        }
      }));
      await exportDailyAnalysisExcel(branchResults, consolidatedMetrics, date1, date2);
    } catch (err) {
      console.error('Export Excel failed', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header & Date Selection Controls */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 border border-border-divider shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Executive Monitoring
              </span>
              <span className="text-xs text-textSecondary font-mono">v1.0</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-textPrimary tracking-tight">
              Daily Sales Analysis
            </h1>
            <p className="text-sm text-textSecondary mt-0.5">
              Side-by-side performance indicators, hit liability, and net profit analysis per branch
            </p>
          </div>

          {/* Date Controls & Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-cardBg/90 backdrop-blur-md rounded-xl p-1.5 border border-border-divider shadow-sm">
              <div className="flex items-center gap-1.5 px-2">
                <span className="text-[11px] font-bold text-textSecondary uppercase">Day 1</span>
                <input
                  type="date"
                  value={date1}
                  onChange={(e) => setDate1(e.target.value)}
                  className="bg-surface/80 text-textPrimary px-2.5 py-1 rounded-lg text-xs font-semibold border border-border-divider focus:outline-none focus:border-accentGreen"
                />
              </div>
              <span className="text-textSecondary px-1 font-bold text-xs">vs</span>
              <div className="flex items-center gap-1.5 px-2">
                <span className="text-[11px] font-bold text-textSecondary uppercase">Day 2</span>
                <input
                  type="date"
                  value={date2}
                  onChange={(e) => setDate2(e.target.value)}
                  className="bg-surface/80 text-textPrimary px-2.5 py-1 rounded-lg text-xs font-semibold border border-border-divider focus:outline-none focus:border-accentGreen"
                />
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setDate1('2026-10-18'); setDate2('2026-10-19'); }}
                className={clsx(
                  "px-3 py-1.5 text-xs font-bold rounded-xl transition-all border",
                  date1 === '2026-10-18' && date2 === '2026-10-19'
                    ? "bg-accentGreen text-slate-950 border-accentGreen shadow-sm shadow-emerald-500/20"
                    : "bg-surface hover:bg-surface-hover text-textSecondary border-border-divider"
                )}
              >
                Oct 18 vs 19
              </button>

              <button
                onClick={loadData}
                disabled={loading}
                title="Refresh API Data"
                className="p-2 rounded-xl bg-surface hover:bg-surface-hover text-textSecondary hover:text-textPrimary border border-border-divider transition-all"
              >
                <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin text-accentGreen")} />
              </button>
            </div>
          </div>
        </div>

        {/* Branch Selector Pill Strip */}
        <div className="mt-5 pt-4 border-t border-border-divider/50 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(!user || user.username === 'admin' || user.username === 'jcstechsupport') && (
            <button
              onClick={() => setSelectedBranchId('all')}
              className={clsx(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border",
                selectedBranchId === 'all'
                  ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20 scale-[1.02]"
                  : "bg-surface/60 hover:bg-surface-hover text-textSecondary border-border-divider hover:text-textPrimary"
              )}
            >
              <Building2 className="w-3.5 h-3.5" />
              Consolidated All Branches
            </button>
          )}

          {allowedBranches.map((b) => {
            const isSelected = selectedBranchId === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBranchId(b.id)}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border",
                  isSelected
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-700 dark:border-white shadow-md font-bold scale-[1.02]"
                    : "bg-surface/50 hover:bg-surface-hover text-textSecondary border-border-divider hover:text-textPrimary"
                )}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                {b.shortName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Card - Formatted Exactly Matching the Screenshot */}
      <div className="relative">
        {/* Action Bar Floating over Card */}
        <div className="flex items-center justify-between mb-3 px-1 no-export">
          <div className="text-xs font-semibold text-textSecondary flex items-center gap-2">
            <span>Viewing:</span>
            <span className="text-textPrimary font-bold">
              {isAll ? 'All 9 Branches Combined' : currentBranch?.name}
            </span>
            <span className="text-textSecondary">•</span>
            <span>{formatDateDisplay(date1)} to {formatDateDisplay(date2)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-border-divider text-xs font-semibold text-textSecondary hover:text-textPrimary flex items-center gap-1.5 transition-all shadow-sm"
            >
              {textCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {textCopied ? 'Copied Text' : 'Copy Text'}
            </button>

            <button
              onClick={handleCopyAsImage}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02]"
            >
              {copiedStatus === 'copied' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied to Clipboard!
                </>
              ) : copiedStatus === 'downloaded' ? (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Image Downloaded!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Card as Image
                </>
              )}
            </button>

            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-border-divider text-xs font-semibold text-textSecondary hover:text-textPrimary flex items-center gap-1.5 transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              {exporting ? 'Exporting...' : 'Excel'}
            </button>
          </div>
        </div>

        {/* Capture Target: Executive Card matching User Screenshot */}
        <div
          ref={reportCardRef}
          className="bg-[#020617] text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden font-sans"
        >
          {/* Subtle Background Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Header Title */}
          <div className="relative z-10 mb-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Daily Sales Analysis – {isAll ? 'Consolidated All Branches' : currentBranch?.name}
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-2 leading-relaxed max-w-3xl">
              Based on the sales monitoring sheet for {formatDateHeader(date1)}–{formatDateHeader(date2)}, 2026, the analysis focuses on gross sales performance, hits, kabig/profit, and daily changes. October 20 remains blank, so the comparison below covers the two completed dates shown.
            </p>
          </div>

          {/* Section: 1. Daily performance summary */}
          <div className="relative z-10 mt-6">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-3">
              1. Daily performance summary
            </h3>

            {/* Table layout matching the screenshot */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-300 text-sm font-semibold">
                    <th className="py-3.5 px-4 sm:px-6">Performance indicator</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right font-bold text-slate-100">
                      {formatDateHeader(date1)}
                    </th>
                    <th className="py-3.5 px-4 sm:px-6 text-right font-bold text-slate-100">
                      {formatDateHeader(date2)}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm sm:text-base">
                  {/* Total Gross Sales */}
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 sm:px-6 text-slate-200 font-medium">
                      Total gross sales
                    </td>
                    <td className="py-3 px-4 sm:px-6 text-right font-bold text-white tabular-nums">
                      {formatCurrency(activeMetrics.date1.gross)}
                    </td>
                    <td className="py-3 px-4 sm:px-6 text-right font-bold text-white tabular-nums">
                      {formatCurrency(activeMetrics.date2.gross)}
                    </td>
                  </tr>

                  {/* Total Hits */}
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 sm:px-6 text-slate-200 font-medium">
                      Total hits
                    </td>
                    <td className="py-3 px-4 sm:px-6 text-right font-bold text-rose-400 tabular-nums">
                      {formatCurrency(activeMetrics.date1.hits)}
                    </td>
                    <td className="py-3 px-4 sm:px-6 text-right font-bold text-rose-400 tabular-nums">
                      {formatCurrency(activeMetrics.date2.hits)}
                    </td>
                  </tr>

                  {/* Final Kabig / Profit */}
                  <tr className="hover:bg-slate-800/30 transition-colors bg-slate-800/20">
                    <td className="py-3.5 px-4 sm:px-6 text-slate-100 font-bold">
                      Final kabig/profit
                    </td>
                    <td className={clsx(
                      "py-3.5 px-4 sm:px-6 text-right font-extrabold tabular-nums",
                      activeMetrics.date1.profit >= 0 ? "text-emerald-400" : "text-rose-500"
                    )}>
                      {formatCurrency(activeMetrics.date1.profit)}
                    </td>
                    <td className={clsx(
                      "py-3.5 px-4 sm:px-6 text-right font-extrabold tabular-nums",
                      activeMetrics.date2.profit >= 0 ? "text-emerald-400" : "text-rose-500"
                    )}>
                      {formatCurrency(activeMetrics.date2.profit)}
                    </td>
                  </tr>

                  {/* Change in Gross Sales */}
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 sm:px-6 text-slate-300 font-medium">
                      Change in gross sales
                    </td>
                    <td className="py-3 px-4 sm:px-6 text-right text-slate-500">—</td>
                    <td className={clsx(
                      "py-3 px-4 sm:px-6 text-right font-bold tabular-nums",
                      activeMetrics.change.gross >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {formatCurrency(activeMetrics.change.gross, true)}
                    </td>
                  </tr>

                  {/* Change in Hits */}
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 sm:px-6 text-slate-300 font-medium">
                      Change in hits
                    </td>
                    <td className="py-3 px-4 sm:px-6 text-right text-slate-500">—</td>
                    <td className={clsx(
                      "py-3 px-4 sm:px-6 text-right font-bold tabular-nums",
                      activeMetrics.change.hits <= 0 ? "text-emerald-400" : "text-amber-400"
                    )}>
                      {formatCurrency(activeMetrics.change.hits, true)}
                    </td>
                  </tr>

                  {/* Change in Kabig / Profit */}
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 text-slate-200 font-bold">
                      Change in kabig/profit
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-right text-slate-500">—</td>
                    <td className={clsx(
                      "py-3.5 px-4 sm:px-6 text-right font-extrabold tabular-nums",
                      activeMetrics.change.profit >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {formatCurrency(activeMetrics.change.profit, true)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Reconciliation Disclaimer */}
            <p className="text-slate-400 text-xs sm:text-sm italic mt-4 leading-relaxed">
              Figures are based on the values visible in the screenshot; totals and the source sheet's profit calculations should be reconciled before final reporting.
            </p>

            {/* Initial Assessment Box */}
            <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 leading-relaxed text-sm sm:text-base text-slate-200">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full border", assessment.badgeClass)}>
                  {assessment.badge}
                </span>
              </div>
              <span className="font-bold text-white">Initial assessment: </span>
              {assessment.text}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Chart & Branch Comparison Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recharts Bar Comparison Chart */}
        <div className="glass-card rounded-2xl p-6 border border-border-divider shadow-xl lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-textPrimary flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-accentGreen" />
                Performance Breakdown
              </h4>
              <span className="text-xs text-textSecondary font-semibold">
                {isAll ? 'Consolidated' : currentBranch?.shortName}
              </span>
            </div>
            <p className="text-xs text-textSecondary mb-4">
              Visual comparison between {formatDateHeader(date1)} and {formatDateHeader(date2)}
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(val) => `₱${Number(val).toLocaleString()}`}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="Gross" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Hits" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Metrics Footer */}
          <div className="mt-4 pt-4 border-t border-border-divider/50 grid grid-cols-2 gap-3 text-xs">
            <div className="bg-surface/60 p-2.5 rounded-xl border border-border-divider">
              <p className="text-textSecondary text-[11px] font-semibold">{formatDateHeader(date1)} Hit Ratio</p>
              <p className="text-base font-extrabold text-textPrimary mt-0.5">
                {activeMetrics.date1.hitRate.toFixed(2)}%
              </p>
            </div>
            <div className="bg-surface/60 p-2.5 rounded-xl border border-border-divider">
              <p className="text-textSecondary text-[11px] font-semibold">{formatDateHeader(date2)} Hit Ratio</p>
              <p className={clsx(
                "text-base font-extrabold mt-0.5",
                activeMetrics.date2.hitRate > 50 ? "text-rose-400" : "text-emerald-400"
              )}>
                {activeMetrics.date2.hitRate.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* Right: Multi-Branch Comparative Leaderboard Table */}
        <div className="glass-card rounded-2xl p-6 border border-border-divider shadow-xl lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-textPrimary flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                Cross-Branch Comparison Leaderboard
              </h4>
              <p className="text-xs text-textSecondary mt-0.5">
                Ranked by {formatDateHeader(date2)} net kabig/profit
              </p>
            </div>
            <button
              onClick={handleExportExcel}
              className="text-xs text-accentGreen hover:underline font-semibold flex items-center gap-1"
            >
              Export Excel <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border-divider">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-surface-header text-textSecondary border-b border-border-divider font-semibold">
                  <th className="py-2.5 px-3">Branch</th>
                  <th className="py-2.5 px-3 text-right">{formatDateHeader(date1)} Gross</th>
                  <th className="py-2.5 px-3 text-right">{formatDateHeader(date2)} Gross</th>
                  <th className="py-2.5 px-3 text-right">{formatDateHeader(date2)} Hits</th>
                  <th className="py-2.5 px-3 text-right">{formatDateHeader(date2)} Kabig</th>
                  <th className="py-2.5 px-3 text-right">Kabig Change</th>
                  <th className="py-2.5 px-3 text-center">Hit Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-divider/50">
                {Object.values(branchMetricsMap)
                  .sort((a, b) => b.metrics.date2.profit - a.metrics.date2.profit)
                  .map(({ branch, metrics }) => {
                    const isSelected = selectedBranchId === branch.id;
                    return (
                      <tr
                        key={branch.id}
                        onClick={() => setSelectedBranchId(branch.id)}
                        className={clsx(
                          "cursor-pointer transition-colors",
                          isSelected
                            ? "bg-accentGreen/10 font-bold"
                            : "hover:bg-surface-hover"
                        )}
                      >
                        <td className="py-2.5 px-3 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: branch.color }} />
                          <span className="text-textPrimary font-semibold">{branch.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-textSecondary tabular-nums">
                          {formatCurrency(metrics.date1.gross)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-textPrimary tabular-nums">
                          {formatCurrency(metrics.date2.gross)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-400 tabular-nums font-medium">
                          {formatCurrency(metrics.date2.hits)}
                        </td>
                        <td className={clsx(
                          "py-2.5 px-3 text-right font-bold tabular-nums",
                          metrics.date2.profit >= 0 ? "text-emerald-400" : "text-rose-500 font-extrabold"
                        )}>
                          {formatCurrency(metrics.date2.profit)}
                        </td>
                        <td className={clsx(
                          "py-2.5 px-3 text-right font-semibold tabular-nums",
                          metrics.change.profit >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {formatCurrency(metrics.change.profit, true)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={clsx(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold",
                            metrics.date2.hitRate > 100
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : metrics.date2.hitRate > 45
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          )}>
                            {metrics.date2.hitRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              {/* Table Footer with Consolidated Totals */}
              <tfoot>
                <tr className="bg-surface font-extrabold border-t-2 border-border-divider text-textPrimary">
                  <td className="py-3 px-3">TOTAL NETWORK</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(consolidatedMetrics.date1.gross)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(consolidatedMetrics.date2.gross)}</td>
                  <td className="py-3 px-3 text-right text-rose-400 tabular-nums">{formatCurrency(consolidatedMetrics.date2.hits)}</td>
                  <td className="py-3 px-3 text-right text-emerald-400 tabular-nums">{formatCurrency(consolidatedMetrics.date2.profit)}</td>
                  <td className={clsx(
                    "py-3 px-3 text-right tabular-nums",
                    consolidatedMetrics.change.profit >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {formatCurrency(consolidatedMetrics.change.profit, true)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      {consolidatedMetrics.date2.hitRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
