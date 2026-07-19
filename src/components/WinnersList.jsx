import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { RefreshCw, Search, FileSpreadsheet, Users, DollarSign, Activity, Trophy, Calendar } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function WinnersList({ selectedEndDate }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [rangeType, setRangeType] = useState('single'); // 'single', '7days', '30days'
  
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const fetchWinnersData = async () => {
    try {
      setLoading(true);
      setError(null);

      const endDate = selectedEndDate ? new Date(selectedEndDate) : new Date();
      const startDate = new Date(endDate);

      if (rangeType === '7days') {
        startDate.setDate(endDate.getDate() - 6);
      } else if (rangeType === '30days') {
        startDate.setDate(endDate.getDate() - 29);
      } else if (rangeType === 'this_year') {
        startDate.setMonth(0, 1); // January 1st of the selected year
      }

      // Exclusive end date
      const exclusiveEndDate = new Date(endDate);
      exclusiveEndDate.setDate(endDate.getDate() + 1);

      const formatDate = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const fromStr = formatDate(startDate);
      const toStr = formatDate(exclusiveEndDate);

      const token = 'Bearer 52205|TGWXBMZeRBNm4tStUGt7kZwMAbBkkX6grM6CVuZP';
      const headers = { 'Authorization': token };

      const url = `https://stl-ldn-api.com/api/accountant/AccountantWinPerDraw?id=5&from=${fromStr}&to=${toStr}&drawId=all&isOffline=0`;
      const response = await axios.get(url, { headers });

      if (response.data && response.data.success && response.data.data) {
        setData(response.data.data);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error(err);
      // We log error but try to show what we have, API returned 401 earlier
      setError("Failed to fetch winners data.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWinnersData();
    setPage(1);
  }, [selectedEndDate, rangeType]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedUnit]);

  const units = useMemo(() => {
    const unique = new Set();
    data.forEach(item => {
      if (item.name) unique.add(item.name);
    });
    return Array.from(unique).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const query = searchTerm.toLowerCase();
      const nameMatch = (item.fullName || '').toLowerCase().includes(query);
      const userMatch = (item.username || '').toLowerCase().includes(query);
      const outletMatch = (item.outlet || '').toLowerCase().includes(query);
      const spvrMatch = (item.supervisorUsername || '').toLowerCase().includes(query) || (item.name || '').toLowerCase().includes(query);

      if (searchTerm && !nameMatch && !userMatch && !outletMatch && !spvrMatch) {
        return false;
      }

      if (selectedUnit && item.name !== selectedUnit) {
        return false;
      }

      return true;
    });
  }, [data, searchTerm, selectedUnit]);

  // Compute stats dynamically
  // We assume the API returns TotalOverAllWin or TotalWin or winAmount based on the Gross data structure
  const getWinAmount = (item) => {
    return Number(item.TotalOverAllWin || item.TotalWin || item.winAmount || item.amount || 0);
  };

  const getHits = (item) => {
    return Number(item.TotalOverAllHits || item.hits || item.hitCount || 0);
  };

  const totalWin = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + getWinAmount(item), 0);
  }, [filteredData]);

  const totalHits = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + getHits(item), 0);
  }, [filteredData]);

  const averageWin = useMemo(() => {
    if (filteredData.length === 0) return 0;
    return totalWin / filteredData.length;
  }, [filteredData, totalWin]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, page]);

  const handleExportExcel = async () => {
    if (filteredData.length === 0) {
      alert("No data available to export.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Iligan Winners List');

    worksheet.columns = [
      { header: 'Teller Name', key: 'fullName', width: 30 },
      { header: 'Username', key: 'username', width: 18 },
      { header: 'Outlet', key: 'outlet', width: 15 },
      { header: 'Unit', key: 'name', width: 15 },
      { header: 'Supervisor', key: 'supervisorUsername', width: 22 },
      { header: 'Draw Time', key: 'drawTime', width: 15 },
      { header: 'Total Win (₱)', key: 'TotalWin', width: 20 },
      { header: 'Total Hits', key: 'TotalHits', width: 15 },
      { header: 'Location', key: 'location', width: 30 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

    filteredData.forEach(item => {
      worksheet.addRow({
        fullName: item.fullName,
        username: item.username,
        outlet: item.outlet,
        name: item.name,
        supervisorUsername: item.supervisorUsername,
        drawTime: item.drawTime,
        TotalWin: getWinAmount(item),
        TotalHits: getHits(item),
        location: item.location || item.address
      });
    });

    const totalRow = worksheet.addRow({
      fullName: 'TOTALS',
      TotalWin: totalWin,
      TotalHits: totalHits
    });
    totalRow.font = { bold: true };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Iligan_Winners_List_${selectedEndDate}.xlsx`);
  };

  return (
    <div className="w-full animate-in fade-in duration-300">
      
      {/* Top Section */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Iligan Winners List</h1>
          <div className="flex items-center gap-2 text-sm text-textSecondary mt-1">
            <span>Daily Winners and Payouts Tracking</span>
            <span className="text-amber-500 font-bold text-[10px] tracking-widest uppercase bg-amber-500/10 px-2 py-0.5 rounded">Iligan Region</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Range Picker */}
          <div className="relative flex items-center bg-cardBg hover:bg-surface-hover border border-border-divider rounded-md transition-all">
            <Calendar className="w-4 h-4 ml-4 text-textSecondary" />
            <select
              value={rangeType}
              onChange={(e) => setRangeType(e.target.value)}
              className="bg-transparent text-textSecondary hover:text-textPrimary px-3 py-2.5 pr-8 text-sm outline-none cursor-pointer appearance-none"
            >
              <option value="single" className="bg-surface">Single Date</option>
              <option value="7days" className="bg-surface">Last 7 Days</option>
              <option value="30days" className="bg-surface">Last 30 Days</option>
              <option value="this_year" className="bg-surface">This Year</option>
            </select>
          </div>

          <button
            onClick={fetchWinnersData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-divider bg-surface-hover hover:bg-surface-hover text-textSecondary transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-600/20 font-medium text-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Card: Total Tellers */}
        <div className="bg-cardBg border border-border-divider/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-5 -mt-5 transition-transform duration-500 group-hover:scale-125"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-textSecondary uppercase tracking-wider mb-1">Total Tellers</p>
              <h3 className="text-3xl font-extrabold text-textPrimary">{filteredData.length}</h3>
            </div>
            <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20">
              <Users className="w-6 h-6 text-indigo-500" />
            </div>
          </div>
          <div className="text-xs text-textSecondary">
            Active in search selection
          </div>
        </div>

        {/* Card: Total Win */}
        <div className="bg-cardBg border border-border-divider/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-5 -mt-5 transition-transform duration-500 group-hover:scale-125"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-textSecondary uppercase tracking-wider mb-1">Total Win</p>
              <h3 className="text-3xl font-extrabold text-textPrimary">₱{totalWin.toLocaleString()}</h3>
            </div>
            <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              <Trophy className="w-6 h-6 text-amber-500" />
            </div>
          </div>
          <div className="text-xs text-amber-500/80 font-medium">
            Accumulated win payouts
          </div>
        </div>

        {/* Card: Total Hits */}
        <div className="bg-cardBg border border-border-divider/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-5 -mt-5 transition-transform duration-500 group-hover:scale-125"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-textSecondary uppercase tracking-wider mb-1">Total Hits</p>
              <h3 className="text-3xl font-extrabold text-textPrimary">{totalHits.toLocaleString()}</h3>
            </div>
            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
              <Activity className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
          <div className="text-xs text-textSecondary">
            Winning ticket hits
          </div>
        </div>

        {/* Card: Average Win */}
        <div className="bg-cardBg border border-border-divider/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-5 -mt-5 transition-transform duration-500 group-hover:scale-125"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-textSecondary uppercase tracking-wider mb-1">Average Win</p>
              <h3 className="text-3xl font-extrabold text-textPrimary">₱{Math.round(averageWin).toLocaleString()}</h3>
            </div>
            <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
              <DollarSign className="w-6 h-6 text-rose-500" />
            </div>
          </div>
          <div className="text-xs text-textSecondary">
            Mean payout per active teller
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-cardBg border border-border-divider/50 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Table Filters */}
        <div className="p-6 border-b border-border-divider flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-textSecondary" />
            <input
              type="text"
              placeholder="Search teller, outlet, unit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-border-divider hover:border-border-divider/80 focus:border-indigo-500/60 rounded-lg pl-10 pr-4 py-2.5 text-sm text-textPrimary placeholder:text-textSecondary outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider whitespace-nowrap">Filter Unit:</label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full md:w-48 bg-surface border border-border-divider hover:border-border-divider/80 focus:border-indigo-500/60 text-textSecondary text-sm rounded-lg px-3 py-2.5 outline-none transition-all cursor-pointer"
            >
              <option value="">All Units</option>
              {units.map(unit => (
                <option key={unit} value={unit}>{unit.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="flex justify-center items-center h-64 text-textSecondary">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500">{error}</div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-textSecondary">No winners data found.</div>
        ) : (
          <>
            {/* Table wrapper */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-divider bg-surface/40">
                    <th className="p-4 text-xs font-semibold text-textSecondary uppercase tracking-wider">Teller Info</th>
                    <th className="p-4 text-xs font-semibold text-textSecondary uppercase tracking-wider">Outlet</th>
                    <th className="p-4 text-xs font-semibold text-textSecondary uppercase tracking-wider">Unit / Group</th>
                    <th className="p-4 text-xs font-semibold text-textSecondary uppercase tracking-wider">Supervisor</th>
                    <th className="p-4 text-xs font-semibold text-textSecondary uppercase tracking-wider text-right">Draw Time</th>
                    <th className="p-4 text-xs font-semibold text-textSecondary uppercase tracking-wider text-right">Win Amount (₱)</th>
                    <th className="p-4 text-xs font-semibold text-textSecondary uppercase tracking-wider text-right">Hits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-divider/40">
                  {paginatedData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-4">
                        <p className="font-semibold text-textPrimary group-hover:text-amber-400 transition-colors">{item.fullName || 'Unknown Teller'}</p>
                        <p className="text-xs text-textSecondary">{item.username || '-'}</p>
                      </td>
                      <td className="p-4 text-sm text-textSecondary font-medium">{item.outlet || '-'}</td>
                      <td className="p-4">
                        <span className="text-xs font-bold text-textSecondary bg-surface-header/80 px-2.5 py-1 rounded">
                          {item.name || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-textSecondary">{item.supervisorUsername || '-'}</td>
                      <td className="p-4 text-sm text-textSecondary font-mono text-right">{item.drawTime || '-'}</td>
                      <td className="p-4 text-right">
                        <span className="font-mono font-bold text-amber-500">₱{getWinAmount(item).toLocaleString()}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded text-xs font-bold">
                          {getHits(item)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border-divider flex justify-between items-center bg-surface/10">
                <span className="text-xs text-textSecondary">
                  Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredData.length)} of {filteredData.length} tellers
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-surface-hover border border-border-divider text-textSecondary hover:bg-surface-hover disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-surface-hover border border-border-divider text-textSecondary hover:bg-surface-hover disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
