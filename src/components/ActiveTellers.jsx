import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, User, Calendar, ReceiptText, Clock, AlertCircle, Download } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import { clsx } from 'clsx';

export default function ActiveTellers({ currentPage, selectedEndDate }) {
  const [tellers, setTellers] = useState([]);
  const [selectedTeller, setSelectedTeller] = useState(null);
  const [bets, setBets] = useState([]);
  const [loadingTellers, setLoadingTellers] = useState(false);
  const [loadingBets, setLoadingBets] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [betSearchQuery, setBetSearchQuery] = useState('');
  const [betStatusFilter, setBetStatusFilter] = useState('ALL'); // 'ALL', 'ACTIVE', 'VOID'

  // Modal State
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionDetails, setTransactionDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const formatDateStr = (d) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [fromDate, setFromDate] = useState(() => formatDateStr(new Date()));
  const [toDate, setToDate] = useState(() => formatDateStr(new Date()));

  const handleDatePreset = (preset) => {
    const today = new Date();
    if (preset === 'today') {
      const dateStr = formatDateStr(today);
      setFromDate(dateStr);
      setToDate(dateStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(today.getDate() - 1);
      const dateStr = formatDateStr(y);
      setFromDate(dateStr);
      setToDate(dateStr);
    } else if (preset === 'last7') {
      const past = new Date();
      past.setDate(today.getDate() - 6);
      setFromDate(formatDateStr(past));
      setToDate(formatDateStr(today));
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(formatDateStr(firstDay));
      setToDate(formatDateStr(today));
    }
  };

  const getApiConfig = () => {
    if (currentPage === 'active_tellers_imp') {
      return {
        authHeader: { headers: { 'Authorization': 'Bearer 56420|m5oBfQqTl33XWmt33FzjLfYWoWEK6w3jPcOWlfz5' } },
        baseUrl: 'https://stl-cotabato-api.com/api',
        idParam: '2'
      };
    }
    if (currentPage === 'active_tellers_iligan') {
      return {
        authHeader: { headers: { 'Authorization': 'Bearer 52592|A0dFlRzQkQe6Nno0TzpMBiBfjoCX0JyYP3O0MbvL' } },
        baseUrl: 'https://stl-ldn-api.com/api',
        idParam: '5'
      };
    }
    if (currentPage === 'active_tellers_lanao') {
      return {
        authHeader: { headers: { 'Authorization': 'Bearer 52595|w2qteJaZwkEX8tkJ2apN4dzBXlrfROnrg1nJEIQ2' } },
        baseUrl: 'https://stl-ldn-api.com/api',
        idParam: '2'
      };
    }
    if (currentPage === 'active_tellers_setb') {
      return {
        authHeader: { headers: { 'Authorization': 'Bearer 52597|wJvojGigncVY82vD7OVxy8W848zuQp3FtDSpyuYP' } },
        baseUrl: 'https://stl-ldn-api.com/api',
        idParam: '7'
      };
    }
    if (currentPage === 'active_tellers_lotto') {
      return {
        authHeader: { headers: { 'Authorization': 'Bearer 52599|QHNKr2h8XzotCiuKy3Zyd45droST6l0ztjCENu66' } },
        baseUrl: 'https://stl-ldn-api.com/api',
        idParam: '8'
      };
    }
    if (currentPage === 'active_tellers_baloi') {
      return {
        authHeader: { headers: { 'Authorization': 'Bearer 52603|xOudfD7LJE5QEvxHmB8Pj4IlXWnrHIQwU1ovmOaH' } },
        baseUrl: 'https://stl-ldn-api.com/api',
        idParam: '6'
      };
    }
    // Default to Maguindanao
    return {
      authHeader: { headers: { 'Authorization': 'Bearer 142725|tF7k4j0Gy0FMkJJnv43H8nkONO6E3BELhnAPANjM' } },
      baseUrl: 'https://stl-mag-api.com/api',
      idParam: '2'
    };
  };

  useEffect(() => {
    fetchTellers();
  }, [currentPage]);

  const fetchTellers = async () => {
    setLoadingTellers(true);
    setError(null);
    try {
      const { authHeader, baseUrl, idParam } = getApiConfig();
      const response = await axios.get(`${baseUrl}/accountant/ActiveTellers?id=${idParam}`, authHeader);
      if (response.data && response.data.data) {
        const activeOnly = response.data.data.filter(t => t.isActive);
        setTellers(activeOnly);
      }
    } catch (err) {
      console.error('Failed to fetch tellers:', err);
      setError('Failed to fetch active tellers.');
    } finally {
      setLoadingTellers(false);
    }
  };

  const fetchBets = async (tellerId) => {
    setLoadingBets(true);
    setBets([]);
    try {
      const { authHeader, baseUrl } = getApiConfig();
      const response = await axios.get(`${baseUrl}/teller/bet?tellerId=${tellerId}&from=${fromDate}&to=${toDate}`, authHeader);
      if (response.data && response.data.data) {
        setBets(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch bets:', err);
    } finally {
      setLoadingBets(false);
    }
  };

  useEffect(() => {
    if (selectedTeller) {
      fetchBets(selectedTeller.id);
    }
  }, [selectedTeller, fromDate, toDate]);

  const filteredTellers = useMemo(() => {
    return tellers.filter(t => 
      t.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.outlet?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tellers, searchQuery]);

  const filteredBets = useMemo(() => {
    return bets.filter(bet => {
      const matchesSearch = !betSearchQuery || bet.transactionId?.toLowerCase().includes(betSearchQuery.toLowerCase());
      const matchesStatus = betStatusFilter === 'ALL' || 
        (betStatusFilter === 'ACTIVE' && bet.isVoid !== 1) || 
        (betStatusFilter === 'VOID' && bet.isVoid === 1);
      return matchesSearch && matchesStatus;
    });
  }, [bets, betSearchQuery, betStatusFilter]);

  const exportToExcel = async () => {
    if (!selectedTeller || filteredBets.length === 0) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Transactions');

      worksheet.addRow(['Teller Transactions Report']);
      worksheet.addRow([`Teller: ${selectedTeller.fullName || selectedTeller.username} (${selectedTeller.username})`]);
      worksheet.addRow([`Outlet: ${selectedTeller.outlet || 'N/A'} | ID: ${selectedTeller.id}`]);
      worksheet.addRow([`Date Range: ${fromDate} to ${toDate}`]);
      worksheet.addRow([`Exported: ${new Date().toLocaleString()}`]);
      worksheet.addRow([]);

      worksheet.addRow(['#', 'Transaction ID', 'Draw Time', 'Date & Time', 'Bet Amount (₱)', 'Status']);

      filteredBets.forEach((b, index) => {
        worksheet.addRow([
          index + 1,
          b.transactionId,
          formatDrawTime(b.drawTime),
          b.created_at,
          Number(b.totalBetAmount || 0),
          b.isVoid === 1 ? 'VOID' : 'ACTIVE'
        ]);
      });

      worksheet.getRow(1).font = { bold: true, size: 14 };
      worksheet.getRow(7).font = { bold: true };
      worksheet.columns = [
        { width: 8 },
        { width: 25 },
        { width: 15 },
        { width: 22 },
        { width: 18 },
        { width: 12 }
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `${selectedTeller.username}_bets_${fromDate}_to_${toDate}.xlsx`);
    } catch (err) {
      console.error('Failed to export bets:', err);
    }
  };



  const fetchTransactionDetails = async (transactionId) => {
    setSelectedTransaction(transactionId);
    setLoadingDetails(true);
    setTransactionDetails([]);
    try {
      const { authHeader, baseUrl } = getApiConfig();
      const response = await axios.get(`${baseUrl}/teller/bet/${transactionId}`, authHeader);
      if (response.data && response.data.data) {
        setTransactionDetails(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch transaction details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatDrawTime = (timeStr) => {
    if (!timeStr) return '';
    const hour = parseInt(timeStr, 10);
    if (isNaN(hour)) return timeStr;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}${ampm}`;
  };



  return (
    <div className="flex h-[calc(100vh-140px)] gap-6">
      {/* Tellers List Sidebar */}
      <div className="w-1/3 bg-cardBg border border-border-divider rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border-divider">
          <h2 className="text-lg font-bold text-textPrimary mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            Teller Transactions
            <span className="ml-auto text-xs font-normal bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
              {tellers.length}
            </span>
          </h2>
          

          
          <div className="flex flex-col gap-3">
            {/* Quick Date Presets */}
            <div className="grid grid-cols-4 gap-1 bg-surface border border-border-divider rounded-lg p-1 text-[11px]">
              <button
                type="button"
                onClick={() => handleDatePreset('today')}
                className={clsx(
                  "py-1 rounded text-center transition-colors font-medium",
                  fromDate === formatDateStr(new Date()) && toDate === formatDateStr(new Date())
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-textSecondary hover:text-textPrimary hover:bg-surface-hover"
                )}
                title="Today"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('yesterday')}
                className={clsx(
                  "py-1 rounded text-center transition-colors font-medium",
                  (() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    const yStr = formatDateStr(y);
                    return fromDate === yStr && toDate === yStr;
                  })()
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-textSecondary hover:text-textPrimary hover:bg-surface-hover"
                )}
                title="Yesterday"
              >
                Yday
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('last7')}
                className={clsx(
                  "py-1 rounded text-center transition-colors font-medium",
                  (() => {
                    const past = new Date();
                    past.setDate(past.getDate() - 6);
                    return fromDate === formatDateStr(past) && toDate === formatDateStr(new Date());
                  })()
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-textSecondary hover:text-textPrimary hover:bg-surface-hover"
                )}
                title="Last 7 Days"
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('thisMonth')}
                className={clsx(
                  "py-1 rounded text-center transition-colors font-medium",
                  (() => {
                    const now = new Date();
                    const first = new Date(now.getFullYear(), now.getMonth(), 1);
                    return fromDate === formatDateStr(first) && toDate === formatDateStr(now);
                  })()
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-textSecondary hover:text-textPrimary hover:bg-surface-hover"
                )}
                title="This Month"
              >
                Month
              </button>
            </div>

            <div className="flex items-center gap-2 w-full justify-between">
              <div className="flex items-center bg-surface border border-border-divider rounded-lg px-2 py-1.5 flex-1 min-w-0">
                <Calendar className="w-3.5 h-3.5 text-textSecondary mr-1 shrink-0" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-transparent text-xs text-textPrimary outline-none w-full cursor-pointer"
                />
              </div>
              <span className="text-textSecondary text-xs shrink-0">to</span>
              <div className="flex items-center bg-surface border border-border-divider rounded-lg px-2 py-1.5 flex-1 min-w-0">
                <Calendar className="w-3.5 h-3.5 text-textSecondary mr-1 shrink-0" />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-transparent text-xs text-textPrimary outline-none w-full cursor-pointer"
                />
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-textSecondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tellers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface text-sm text-textPrimary rounded-lg pl-9 pr-4 py-2 border border-border-divider focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {loadingTellers ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-rose-400 text-sm flex flex-col items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              {error}
            </div>
          ) : filteredTellers.length === 0 ? (
            <div className="p-8 text-center text-textSecondary text-sm">No tellers found.</div>
          ) : (
            filteredTellers.map((teller) => (
              <button
                key={teller.id}
                onClick={() => setSelectedTeller(teller)}
                className={`w-full text-left p-3 rounded-lg transition-all flex items-start gap-3 ${
                  selectedTeller?.id === teller.id 
                    ? 'bg-blue-600/20 border border-blue-500/30' 
                    : 'hover:bg-surface-hover border border-transparent'
                }`}
              >
                <div className={`w-2 h-2 mt-1.5 rounded-full ${teller.isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                <div>
                  <div className={`font-medium text-sm ${selectedTeller?.id === teller.id ? 'text-blue-400' : 'text-textPrimary'}`}>
                    {teller.fullName ? `${teller.fullName} (${teller.username})` : teller.username}
                  </div>
                  <div className="text-xs text-textSecondary mt-0.5">{teller.outlet || 'No Outlet'} • {teller.location}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Bets Details Area */}
      <div className="flex-1 bg-cardBg border border-border-divider rounded-xl overflow-hidden flex flex-col">
        {selectedTeller ? (
          <>
            <div className="p-4 border-b border-border-divider flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-header/30">
              <div>
                <h2 className="text-xl font-bold text-textPrimary flex items-center gap-2">
                  <ReceiptText className="w-5 h-5 text-indigo-400" />
                  Bets for {selectedTeller.fullName ? `${selectedTeller.fullName} (${selectedTeller.username})` : selectedTeller.username}
                </h2>
                <p className="text-sm text-textSecondary mt-0.5">Outlet: {selectedTeller.outlet || 'N/A'} | ID: {selectedTeller.id}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportToExcel}
                  disabled={filteredBets.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 shadow-sm"
                  title="Export to Excel"
                >
                  <Download className="w-3.5 h-3.5" /> Export Excel
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            {!loadingBets && bets.length > 0 && (() => {
              const activeBetsList = bets.filter(b => b.isVoid !== 1);
              const voidBetsList = bets.filter(b => b.isVoid === 1);
              const activeTotal = activeBetsList.reduce((acc, curr) => acc + Number(curr.totalBetAmount || 0), 0);
              const voidTotal = voidBetsList.reduce((acc, curr) => acc + Number(curr.totalBetAmount || 0), 0);

              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 border-b border-border-divider bg-surface-header/20">
                  <div className="bg-surface border border-border-divider rounded-lg p-3 shadow-sm">
                    <p className="text-xs text-textSecondary uppercase tracking-wider mb-1">Active Gross</p>
                    <p className="text-xl font-bold text-emerald-400">₱{activeTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBetStatusFilter('ALL')}
                    className={clsx(
                      "text-left bg-surface border rounded-lg p-3 shadow-sm transition-all cursor-pointer",
                      betStatusFilter === 'ALL'
                        ? "border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.2)] bg-indigo-500/5"
                        : "border-border-divider hover:border-indigo-500/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-textSecondary uppercase tracking-wider mb-1">Total Bets (All)</p>
                      {betStatusFilter === 'ALL' && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-semibold">Active</span>}
                    </div>
                    <p className="text-xl font-bold text-textPrimary">{bets.length}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBetStatusFilter('ACTIVE')}
                    className={clsx(
                      "text-left bg-surface border rounded-lg p-3 shadow-sm transition-all cursor-pointer",
                      betStatusFilter === 'ACTIVE'
                        ? "border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)] bg-emerald-500/5"
                        : "border-border-divider hover:border-emerald-500/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-textSecondary uppercase tracking-wider mb-1">Active Bets</p>
                      {betStatusFilter === 'ACTIVE' && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-semibold">Active</span>}
                    </div>
                    <p className="text-xl font-bold text-emerald-400">{activeBetsList.length}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBetStatusFilter('VOID')}
                    className={clsx(
                      "text-left bg-surface border rounded-lg p-3 shadow-sm transition-all cursor-pointer",
                      betStatusFilter === 'VOID'
                        ? "border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)] bg-rose-500/10"
                        : "border-border-divider hover:border-rose-500/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-rose-400 uppercase tracking-wider font-semibold mb-1">Void Bets</p>
                      <span className="text-[11px] font-bold text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded">
                        {voidBetsList.length}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-rose-400">₱{voidTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </button>
                </div>
              );
            })()}

            {/* Bets Sub-toolbar */}
            {!loadingBets && bets.length > 0 && (
              <div className="p-3 border-b border-border-divider bg-surface flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="w-3.5 h-3.5 text-textSecondary absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search transaction ID..."
                    value={betSearchQuery}
                    onChange={(e) => setBetSearchQuery(e.target.value)}
                    className="w-full bg-cardBg text-xs text-textPrimary rounded-md pl-8 pr-3 py-1.5 border border-border-divider focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={betStatusFilter}
                    onChange={(e) => setBetStatusFilter(e.target.value)}
                    className="bg-cardBg border border-border-divider text-xs text-textPrimary rounded-md px-2.5 py-1.5 outline-none cursor-pointer"
                  >
                    <option value="ALL">All Status (Active & Void)</option>
                    <option value="ACTIVE">Active Only</option>
                    <option value="VOID">Void Transactions Only</option>
                  </select>

                  <span className="text-xs text-textSecondary bg-cardBg px-2 py-1 rounded border border-border-divider">
                    Showing: <strong className="text-indigo-400">{filteredBets.length}</strong>
                  </span>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              {loadingBets ? (
                <div className="flex flex-col items-center justify-center h-full text-textSecondary">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
                  Loading bets...
                </div>
              ) : filteredBets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-textSecondary">
                  <ReceiptText className="w-12 h-12 text-textSecondary mb-3 opacity-50" />
                  <p>{bets.length === 0 ? 'No bets found for this date range.' : 'No bets match your search filter.'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border-divider">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-header/50 border-b border-border-divider">
                        <th className="py-3 px-4 font-semibold text-xs text-textSecondary uppercase tracking-wider">Transaction ID</th>
                        <th className="py-3 px-4 font-semibold text-xs text-textSecondary uppercase tracking-wider">Draw</th>
                        <th className="py-3 px-4 font-semibold text-xs text-textSecondary uppercase tracking-wider">Time</th>
                        <th className="py-3 px-4 font-semibold text-xs text-textSecondary uppercase tracking-wider text-right">Amount</th>
                        <th className="py-3 px-4 font-semibold text-xs text-textSecondary uppercase tracking-wider text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-divider/50">
                      {filteredBets.map((bet, idx) => {
                        const isVoidBet = bet.isVoid === 1;
                        return (
                          <tr 
                            key={idx} 
                            onClick={() => fetchTransactionDetails(bet.transactionId)}
                            className={clsx(
                              "transition-colors cursor-pointer group",
                              isVoidBet 
                                ? "bg-rose-500/5 hover:bg-rose-500/10" 
                                : "hover:bg-surface-hover/50"
                            )}
                          >
                            <td className="py-3 px-4">
                              <div className={clsx(
                                "font-mono text-sm font-medium transition-colors",
                                isVoidBet ? "text-rose-400 group-hover:text-rose-300" : "text-indigo-400 group-hover:text-indigo-300"
                              )}>
                                {bet.transactionId}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-textSecondary">
                              {formatDrawTime(bet.drawTime)}
                            </td>
                            <td className="py-3 px-4 text-xs text-textSecondary">
                              {bet.created_at}
                            </td>
                            <td className={clsx("py-3 px-4 text-right font-bold", isVoidBet ? "text-rose-400 line-through opacity-80" : "text-textPrimary")}>
                              ₱{Number(bet.totalBetAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isVoidBet ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/15 px-2.5 py-1 rounded-full border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.15)]">
                                  VOID
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                  ACTIVE
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-textSecondary">
            <User className="w-16 h-16 text-slate-700 mb-4 opacity-50" />
            <p>Select a teller from the list to view their bets</p>
          </div>
        )}
      </div>

      {/* Bet Information Modal */}
      {selectedTransaction && (() => {
        const currentBet = bets.find(b => b.transactionId === selectedTransaction);
        const isVoidTransaction = currentBet?.isVoid === 1;

        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedTransaction(null)}
          >
            <div 
              className="bg-surface-hover border border-border-divider rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-5 border-b border-border-divider bg-surface-header/50">
                <div className="flex items-center gap-2">
                  <ReceiptText className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-xl font-bold text-textPrimary">
                    Bet Information
                  </h3>
                  {isVoidTransaction && (
                    <span className="text-xs font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">
                      VOID
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedTransaction(null)}
                  className="text-textSecondary hover:text-textPrimary transition-colors"
                >
                  <AlertCircle className="w-5 h-5 opacity-0 absolute" />
                  <span className="text-2xl leading-none">&times;</span>
                </button>
              </div>
              
              <div className="p-6">
                {loadingDetails ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-6 bg-surface p-4 rounded-lg border border-border-divider text-sm">
                      <p><span className="text-textSecondary block mb-1">Trans. ID:</span> <span className="font-mono text-indigo-400 font-medium text-base">{selectedTransaction}</span></p>
                      <p><span className="text-textSecondary block mb-1">Total Amount:</span> <span className={clsx("font-bold text-base", isVoidTransaction ? "text-rose-400" : "text-emerald-400")}>₱{transactionDetails.reduce((sum, item) => sum + Number(item.betAmount), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></p>
                      <p><span className="text-textSecondary block mb-1">Draw Time:</span> <span className="text-textPrimary">{transactionDetails.length > 0 ? formatDrawTime(transactionDetails[0].drawTime) : ''}</span></p>
                      <p><span className="text-textSecondary block mb-1">Bet Time:</span> <span className="text-textPrimary">{transactionDetails.length > 0 ? transactionDetails[0].created_at : ''}</span></p>
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-border-divider">
                            <th className="pb-3 text-textSecondary font-semibold uppercase tracking-wider text-xs">Bet Code</th>
                            <th className="pb-3 text-textSecondary font-semibold uppercase tracking-wider text-xs">Bet Number</th>
                            <th className="pb-3 text-textSecondary font-semibold uppercase tracking-wider text-xs text-right">Bet Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-divider/50">
                          {transactionDetails.map((item, i) => (
                            <tr key={i} className="hover:bg-surface-hover transition-colors">
                              <td className="py-3 text-textSecondary font-medium">
                                <span className="bg-surface-header px-2 py-1 rounded text-xs">{item.betCode}</span>
                              </td>
                              <td className="py-3 text-textPrimary font-bold">{item.betNo}</td>
                              <td className="py-3 text-emerald-400 font-medium text-right">₱{Number(item.betAmount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
