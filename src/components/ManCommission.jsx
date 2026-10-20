import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Calendar, 
  Download, 
  Search, 
  RefreshCw, 
  DollarSign, 
  Users, 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { MAN_COMMISSION_GROUPS, normalizeName } from '../config/manCommissionGroups';
import { exportManCommissionExcel } from '../utils/exportManCommissionExcel';

export default function ManCommission({ selectedDate, setSelectedDate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchDayData = async (dateStr) => {
    setLoading(true);
    setError(null);
    try {
      const authHeader = {
        headers: {
          Authorization: 'Bearer 3670|1Q5zbXZYKfjTcftKMKuz0oAtJXMwaeIZT0LI73fa'
        }
      };
      const url = `https://stl-mandaue-api.com/api/accountant/TellerGrossPerDateRange?id=2&from=${dateStr}&to=${dateStr}`;
      const res = await axios.get(url, authHeader);
      
      if (res.data && Array.isArray(res.data.data)) {
        setData(res.data.data);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error('Failed to fetch MAN commission data', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchDayData(selectedDate);
    }
  }, [selectedDate]);

  // Map API records by normalized name
  const tellerGrossMap = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(data)) return map;

    data.forEach((item) => {
      const rawName = item.fullName || item.username || '';
      const norm = normalizeName(rawName);
      if (norm) {
        const currentGross = map.get(norm) || 0;
        map.set(norm, currentGross + (Number(item.TotalOverAllGross) || 0));
      }
    });

    return map;
  }, [data]);

  // Construct structured groups with live gross (excluding 0 amount)
  const groupsWithGross = useMemo(() => {
    return MAN_COMMISSION_GROUPS.map((group) => {
      let groupTotal = 0;
      const tellers = group.tellers
        .map((tellerName) => {
          const norm = normalizeName(tellerName);
          let gross = tellerGrossMap.get(norm);

          // If not exact match, try matching substrings for common alias variants
          if (gross === undefined) {
            for (const [apiKey, apiGross] of tellerGrossMap.entries()) {
              if (apiKey.includes(norm) || norm.includes(apiKey)) {
                gross = apiGross;
                break;
              }
            }
          }

          const finalGross = gross !== undefined ? gross : 0;
          groupTotal += finalGross;

          return {
            name: tellerName,
            gross: finalGross
          };
        })
        .filter((t) => t.gross > 0); // Exclude 0 amount tellers

      return {
        ...group,
        tellers,
        total: groupTotal
      };
    });
  }, [tellerGrossMap]);

  // Overall Statistics
  const stats = useMemo(() => {
    let grandTotal = 0;
    let activeTellers = 0;
    let totalConfigured = 0;

    MAN_COMMISSION_GROUPS.forEach((g) => {
      totalConfigured += g.tellers.length;
    });

    groupsWithGross.forEach((g) => {
      grandTotal += g.total;
      activeTellers += g.tellers.length;
    });

    return {
      grandTotal,
      activeTellers,
      totalConfigured,
      excludedCount: totalConfigured - activeTellers,
      totalGroups: groupsWithGross.length
    };
  }, [groupsWithGross]);

  // Format date display label
  const formattedDateLabel = useMemo(() => {
    if (!selectedDate) return '';
    const d = new Date(selectedDate);
    const m = d.toLocaleString('default', { month: 'short' });
    const day = d.getDate();
    return `${m}${day}`;
  }, [selectedDate]);

  // Quick Date Navigation
  const changeDateByDays = (days) => {
    const d = new Date(selectedDate || new Date());
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportManCommissionExcel(groupsWithGross, selectedDate);
    } catch (err) {
      console.error('Export failed', err);
      alert('Failed to generate Excel file');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Controls Bar */}
      <div className="glass-card rounded-2xl p-4 md:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Date Selector and Fast Navigator */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center glass-card rounded-xl px-3 py-2">
            <button
              onClick={() => changeDateByDays(-1)}
              className="p-1.5 hover:bg-surface-hover rounded-lg text-textSecondary hover:text-textPrimary transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-textPrimary font-semibold text-sm outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>

            <button
              onClick={() => changeDateByDays(1)}
              className="p-1.5 hover:bg-surface-hover rounded-lg text-textSecondary hover:text-textPrimary transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              const d = new Date();
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              setSelectedDate(`${y}-${m}-${day}`);
            }}
            className="px-3 py-2 text-xs font-semibold rounded-xl glass-card hover:bg-surface-hover text-textSecondary hover:text-textPrimary transition-colors"
          >
            Today
          </button>

          <button
            onClick={() => fetchDayData(selectedDate)}
            disabled={loading}
            className="p-2.5 rounded-xl glass-card hover:bg-surface-hover text-textSecondary hover:text-textPrimary transition-all disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

        {/* Search & Export Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input
              type="text"
              placeholder="Search teller in groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b1329]/60 border border-border-divider/50 rounded-xl pl-9 pr-4 py-2 text-sm text-textPrimary placeholder:text-textSecondary/60 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-bold px-4 py-2 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] text-sm disabled:opacity-50 cursor-pointer"
          >
            <Download className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} />
            {exporting ? 'Exporting...' : 'Download Excel'}
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-textSecondary">Day Total Commission Gross</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-0.5">
              ₱{stats.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </h3>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 relative overflow-hidden flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-textSecondary">Total Groups</p>
            <h3 className="text-2xl font-bold text-textPrimary mt-0.5">{stats.totalGroups}</h3>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 relative overflow-hidden flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-textSecondary">Active Tellers (Gross &gt; 0)</p>
            <h3 className="text-2xl font-bold text-textPrimary mt-0.5">{stats.activeTellers}</h3>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 relative overflow-hidden flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-textSecondary">Excluded Zero Amount</p>
            <h3 className="text-2xl font-bold text-amber-400 mt-0.5">
              {stats.excludedCount} <span className="text-xs text-textSecondary font-normal">tellers</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="glass-card rounded-2xl p-16 flex flex-col items-center justify-center text-textSecondary">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-400 mb-4"></div>
          <p className="text-sm font-medium">Fetching Mandaue Commission Data for {selectedDate}...</p>
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 border border-red-500/30 bg-red-500/10 flex items-center gap-4 text-red-400">
          <AlertCircle className="w-8 h-8 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-base">Error Loading Data</h4>
            <p className="text-sm opacity-90">{error}</p>
            <button
              onClick={() => fetchDayData(selectedDate)}
              className="mt-3 px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-xs font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        /* Multi-column Grid Layout matching the Image */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
          
          {/* Column 1: RWS & COORDINATOR: LONGWIND */}
          <div className="space-y-6">
            {renderGroupTable(groupsWithGross.find((g) => g.id === 'rws'), formattedDateLabel, searchQuery)}
            {renderGroupTable(groupsWithGross.find((g) => g.id === 'longwind'), formattedDateLabel, searchQuery)}
          </div>

          {/* Column 2: PNP COMMISION, COORDINATOR: KAPITAN, SPVR-APPLE */}
          <div className="space-y-6">
            {renderGroupTable(groupsWithGross.find((g) => g.id === 'pnp_commission'), formattedDateLabel, searchQuery)}
            {renderGroupTable(groupsWithGross.find((g) => g.id === 'kapitan'), formattedDateLabel, searchQuery)}
            {renderGroupTable(groupsWithGross.find((g) => g.id === 'spvr_apple'), formattedDateLabel, searchQuery)}
          </div>

          {/* Column 3: GROUP C, GROUP D, GROUP G, GROUP EDIK */}
          <div className="space-y-6">
            {renderGroupTable(groupsWithGross.find((g) => g.id === 'group_c'), formattedDateLabel, searchQuery)}
            {renderGroupTable(groupsWithGross.find((g) => g.id === 'group_d'), formattedDateLabel, searchQuery)}
            {renderGroupTable(groupsWithGross.find((g) => g.id === 'group_g'), formattedDateLabel, searchQuery)}
            {renderGroupTable(groupsWithGross.find((g) => g.id === 'group_edik'), formattedDateLabel, searchQuery)}
          </div>

          {/* Column 4: SPVR-MOLLY */}
          <div className="space-y-6">
            {renderGroupTable(groupsWithGross.find((g) => g.id === 'spvr_molly'), formattedDateLabel, searchQuery)}
          </div>

        </div>
      )}
    </div>
  );
}

function renderGroupTable(group, formattedDateLabel, searchQuery) {
  if (!group) return null;

  const filteredTellers = group.tellers.filter((t) =>
    !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      key={group.id}
      className="rounded-xl overflow-hidden border border-[#334155]/60 bg-[#0f172a]/80 shadow-xl transition-all hover:border-emerald-500/40"
    >
      {/* Title Header */}
      <div className="bg-[#1e293b] px-4 py-2 text-center border-b border-[#334155]/60">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">{group.title}</h4>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            {/* Date Row (Cyan) */}
            <tr className="bg-[#00e5ff] text-slate-950 font-bold border-b border-black/20">
              <th className="px-3 py-1.5 border-r border-black/20 text-center font-bold">Date</th>
              <th className="px-3 py-1.5 text-center font-bold">{formattedDateLabel}</th>
            </tr>
            {/* Header Row (Teller: Cyan, Gross: Red) */}
            <tr className="border-b border-black/20">
              <th className="bg-[#00e5ff] text-slate-950 font-bold px-3 py-1.5 border-r border-black/20 text-center">
                Teller
              </th>
              <th className="bg-[#ef4444] text-white font-bold px-3 py-1.5 text-center">
                Gross
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#334155]/40 text-slate-200">
            {filteredTellers.length === 0 ? (
              <tr>
                <td colSpan="2" className="text-center py-3 text-slate-500 text-xs italic">
                  No matching tellers
                </td>
              </tr>
            ) : (
              filteredTellers.map((t, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-800/60 transition-colors font-medium text-[11px]"
                >
                  <td className="px-3 py-1.5 border-r border-[#334155]/40 truncate max-w-[180px]">
                    {t.name}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-100">
                    {t.gross > 0 ? (
                      t.gross.toLocaleString()
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            {/* Total Row (Light Green / Olive) */}
            <tr className="bg-[#bbf7d0] text-slate-900 font-bold border-t-2 border-[#334155]">
              <td className="px-3 py-1.5 text-center font-bold tracking-wider text-xs border-r border-black/20">
                TOAL
              </td>
              <td className="px-3 py-1.5 text-right font-mono font-bold text-xs text-slate-950">
                {group.total.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
