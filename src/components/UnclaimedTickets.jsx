import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { RefreshCw, Search, Filter } from 'lucide-react';
import FilterDropdown from './FilterDropdown';

export default function UnclaimedTickets({ selectedEndDate, selectedUnits, selectedTellers, spvrMap, currentPage }) {
  const [tickets, setTickets] = useState([]);

  // Helper to convert military hour to 12-hour AM/PM format (e.g. 14 -> 2PM)
  const formatDrawTime = (timeStr) => {
    if (!timeStr) return '';
    const hour = parseInt(timeStr, 10);
    if (isNaN(hour)) return timeStr;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}${ampm}`;
  };

  // Helper to calculate status based on Transaction ID date (MMDDYY-XXXX)
  const getTicketStatus = (transactionId) => {
    if (!transactionId || transactionId.length < 6) return { text: 'Unclaimed', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };

    try {
      const mm = parseInt(transactionId.substring(0, 2), 10);
      const dd = parseInt(transactionId.substring(2, 4), 10);
      const yy = parseInt("20" + transactionId.substring(4, 6), 10);

      const ticketDate = new Date(yy, mm - 1, dd);
      const today = new Date();
      ticketDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - ticketDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 2) {
        return { text: 'Recent', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
      } else if (diffDays === 3) {
        return { text: `Warning (${diffDays} days)`, className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
      } else {
        return { text: `Overdue (${diffDays} days)`, className: 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse' };
      }
    } catch (e) {
      return { text: 'Unclaimed', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
    }
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      // Determine auth token based on the page
      let authHeader;
      if (currentPage === 'unclaimed_ldn') {
        authHeader = { headers: { 'Authorization': 'Bearer 52382|TbvbjynEw9xiusXbvQ1ZG7iTZyQPdK0vCaZvhdN2' } };
      } else if (currentPage === 'unclaimed_lds') {
        authHeader = { headers: { 'Authorization': 'Bearer 111012|Ag4bzY0DBPYHbQsl8QxhqpdURrT6LYmsWnQsLEif' } };
      } else if (currentPage === 'unclaimed_imp') {
        authHeader = { headers: { 'Authorization': 'Bearer 56406|I3jbYEequ4SjZPy4c3JI8QxQ7riFti5CdfKI1xN1' } };
      } else {
        authHeader = { headers: { 'Authorization': 'Bearer 142375|bgm3cNBv4knCMImS9OLYFiMr7mIV7aDirkb0msqH' } };
      }

      const endDate = selectedEndDate ? new Date(selectedEndDate) : new Date();
      const pastDate = new Date(endDate);
      pastDate.setDate(endDate.getDate() - 30); // fetch last 30 days of unclaimed tickets

      const formatDate = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const toStr = formatDate(endDate);
      const fromStr = formatDate(pastDate);

      let url;
      if (currentPage === 'unclaimed_ldn') {
        url = `https://stl-ldn-api.com/api/accountant/UnclaimedReceipts?isClaim=0&from=${fromStr}&to=${toStr}`;
      } else if (currentPage === 'unclaimed_lds') {
        url = `https://stl-lds-api.com/api/accountant/UnclaimedReceipts?isClaim=0&from=${fromStr}&to=${toStr}`;
      } else if (currentPage === 'unclaimed_imp') {
        url = `https://stl-cotabato-api.com/api/accountant/UnclaimedReceipts?isClaim=0&from=${fromStr}&to=${toStr}`;
      } else {
        url = `https://stl-mag-api.com/api/accountant/UnclaimedReceipts?isClaim=0&id=2&from=${fromStr}&to=${toStr}`;
      }

      const response = await axios.get(url, authHeader);

      if (response.data && response.data.data) {
        setTickets(response.data.data);
      } else {
        setTickets([]);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load unclaimed tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [selectedEndDate, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedUnits, selectedTellers]);

  // --- AUTOMATED GDRIVE SYNC (CRON JOB ALTERNATIVE FOR BROWSER) ---
  const ticketsRef = React.useRef(tickets);
  const currentPageRef = React.useRef(currentPage);
  const spvrMapRef = React.useRef(spvrMap);
  const lastSyncRef = React.useRef(null);

  useEffect(() => {
    ticketsRef.current = tickets;
    currentPageRef.current = currentPage;
    spvrMapRef.current = spvrMap;
  }, [tickets, currentPage, spvrMap]);

  useEffect(() => {
    const checkAndSync = async () => {
      try {
        const now = new Date();
        const options = { timeZone: 'Asia/Manila', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' };
        const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);

        const day = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);
        const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
        const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

        // Check if it's the 1st of the month at 10:00 PM (22:00) PHT
        if (day === 1 && hour === 22 && minute === 0) {
          const currentMonth = now.getMonth();

          // Prevent multiple syncs in the same minute
          if (lastSyncRef.current === currentMonth) return;
          lastSyncRef.current = currentMonth;

          console.log(`Cron: Fetching exact previous month data for GDrive sync...`);

          // Calculate exact start and end of previous month
          const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

          const formatDate = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dayStr = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${dayStr}`;
          };

          const fromStr = formatDate(prevMonthStart);
          const toStr = formatDate(prevMonthEnd);

          // Format month name (e.g. "June 2026")
          const monthName = prevMonthStart.toLocaleString('default', { month: 'long', year: 'numeric' });

          let authHeader, url;
          let branchTabName = 'maguindanao';

          if (currentPageRef.current === 'unclaimed_ldn') {
            branchTabName = 'LDN';
            authHeader = { headers: { 'Authorization': 'Bearer 52382|TbvbjynEw9xiusXbvQ1ZG7iTZyQPdK0vCaZvhdN2' } };
            url = `https://stl-ldn-api.com/api/accountant/UnclaimedReceipts?isClaim=0&from=${fromStr}&to=${toStr}`;
          } else if (currentPageRef.current === 'unclaimed_lds') {
            branchTabName = 'LDS';
            authHeader = { headers: { 'Authorization': 'Bearer 111012|Ag4bzY0DBPYHbQsl8QxhqpdURrT6LYmsWnQsLEif' } };
            url = `https://stl-lds-api.com/api/accountant/UnclaimedReceipts?isClaim=0&from=${fromStr}&to=${toStr}`;
          } else if (currentPageRef.current === 'unclaimed_imp') {
            branchTabName = 'imperial';
            authHeader = { headers: { 'Authorization': 'Bearer 56406|I3jbYEequ4SjZPy4c3JI8QxQ7riFti5CdfKI1xN1' } };
            url = `https://stl-cotabato-api.com/api/accountant/UnclaimedReceipts?isClaim=0&from=${fromStr}&to=${toStr}`;
          } else {
            branchTabName = 'maguindanao';
            authHeader = { headers: { 'Authorization': 'Bearer 142375|bgm3cNBv4knCMImS9OLYFiMr7mIV7aDirkb0msqH' } };
            url = `https://stl-mag-api.com/api/accountant/UnclaimedReceipts?isClaim=0&id=2&from=${fromStr}&to=${toStr}`;
          }

          const response = await axios.get(url, authHeader);
          let monthTickets = (response.data && response.data.data) ? response.data.data : [];

          if (monthTickets.length === 0) {
            console.log("Cron: No unclaimed tickets for previous month to sync.");
            return;
          }

          // Map supervisor names for grouped layout in GDrive
          monthTickets = monthTickets.map(t => {
            const spvrId = String(t.supervisor);
            const spvrObj = (spvrMapRef.current || []).find(s => String(s.id) === spvrId);
            const spvrName = (spvrObj ? (spvrObj.username || spvrObj.fullName) : t.username)?.toUpperCase() || 'UNKNOWN UNIT';
            return { ...t, mappedSupervisor: spvrName };
          });

          console.log(`Cron: Triggering GDrive sync for ${currentPageRef.current} unclaimed tickets (${monthName}) at 10 PM PHT.`);

          // IMPORTANT: Replace this URL with your actual Google Apps Script Web App URL
          const G_DRIVE_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbx6aIvit432Pnh4yENjg50JkMTILQP8D1BEnI3l-wBO8B3iJb8kBQI_6X0amW5dECRPGA/exec';

          if (G_DRIVE_WEBHOOK_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
            console.warn("Cron: Please provide your Google Apps Script Webhook URL to enable GDrive syncing.");
            return;
          }

          const payload = {
            action: 'saveData',
            tabName: branchTabName,
            monthName: monthName,
            branch: currentPageRef.current,
            timestamp: new Date().toISOString(),
            tickets: monthTickets
          };

          // Use text/plain for Google Apps Script to avoid CORS preflight issues
          await axios.post(G_DRIVE_WEBHOOK_URL, JSON.stringify(payload), {
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
          });
          console.log(`Cron: Successfully synced ${monthName} unclaimed tickets to GDrive.`);
        }
      } catch (err) {
        console.error("Cron Error: Failed to sync unclaimed tickets to GDrive:", err);
      }
    };

    // Check every 60 seconds
    const intervalId = setInterval(checkAndSync, 60000);
    // Initial check on mount
    checkAndSync();

    return () => clearInterval(intervalId);
  }, []);


  const { filteredTickets, groupedTickets, sortedSpvrs } = useMemo(() => {
    const filtered = tickets.filter(t => {
      // 1. Text Search
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matchesSearch = (
          (t.transactionId || '').toLowerCase().includes(s) ||
          (t.fullName || '').toLowerCase().includes(s) ||
          (t.username || '').toLowerCase().includes(s) ||
          (t.betNo || '').toLowerCase().includes(s) ||
          (t.betCode || '').toLowerCase().includes(s)
        );
        if (!matchesSearch) return false;
      }

      // 2. Global Dropdown Filters
      const spvrId = String(t.supervisor);
      if (selectedUnits && selectedUnits.length > 0 && !selectedUnits.includes(spvrId)) {
        return false;
      }
      if (selectedTellers && selectedTellers.length > 0 && !selectedTellers.includes(t.username) && !selectedTellers.includes(t.fullName)) {
        return false;
      }

      return true;
    });

    // Group by Supervisor
    const grouped = {};
    filtered.forEach(t => {
      const spvrId = String(t.supervisor);
      const spvrObj = (spvrMap || []).find(s => String(s.id) === spvrId);
      // Prefer the global map's name if available, else the ticket's username
      const spvrName = (spvrObj ? (spvrObj.username || spvrObj.fullName) : t.username)?.toUpperCase() || 'UNKNOWN UNIT';

      if (!grouped[spvrName]) {
        grouped[spvrName] = [];
      }
      grouped[spvrName].push(t);
    });

    // Sort supervisors alphabetically
    const sorted = Object.keys(grouped).sort();
    return { filteredTickets: filtered, groupedTickets: grouped, sortedSpvrs: sorted };
  }, [tickets, searchTerm, selectedUnits, selectedTellers, spvrMap]);

  const totalPages = Math.ceil(sortedSpvrs.length / itemsPerPage);
  const paginatedSpvrs = sortedSpvrs.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="w-full animate-in fade-in duration-300">

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">
            {currentPage === 'unclaimed_ldn' ? 'LDN' : currentPage === 'unclaimed_lds' ? 'LDS' : currentPage === 'unclaimed_imp' ? 'Imp' : 'Mag'} Unclaimed Winning Tickets
          </h1>
          <div className="flex items-center gap-2 text-sm text-textSecondary mt-1">
            <span>Winning Receipts Pending Claim</span>
            <span className="text-rose-500 font-bold text-[10px] tracking-widest uppercase bg-rose-500/10 px-2 py-0.5 rounded">Action Required</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search ID, Teller, Bet No, or Code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-appBg border border-slate-700/50 rounded-lg pl-9 pr-4 py-2.5 text-sm w-full md:w-64 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            onClick={fetchTickets}
            disabled={loading}
            className="flex items-center justify-center p-2.5 rounded-lg bg-slate-800 border border-slate-700/50 hover:bg-slate-700 transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 text-slate-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-cardBg border border-slate-800/50 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#10b981] mr-3"></div>
            Loading Data...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500">{error}</div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No unclaimed tickets found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-700">
                  <th className="py-4 px-6 font-semibold text-xs text-slate-400 uppercase tracking-wider">Teller</th>
                  <th className="py-4 px-6 font-semibold text-xs text-slate-400 uppercase tracking-wider">Transaction ID</th>
                  <th className="py-4 px-6 font-semibold text-xs text-slate-400 uppercase tracking-wider">Draw</th>
                  <th className="py-4 px-6 font-semibold text-xs text-slate-400 uppercase tracking-wider">Game Code</th>
                  <th className="py-4 px-6 font-semibold text-xs text-slate-400 uppercase tracking-wider">Bet No</th>
                  <th className="py-4 px-6 font-semibold text-xs text-slate-400 uppercase tracking-wider text-right">Bet Amt</th>
                  <th className="py-4 px-6 font-semibold text-xs text-slate-400 uppercase tracking-wider text-right">Win Amt</th>
                  <th className="py-4 px-6 font-semibold text-xs text-slate-400 uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {paginatedSpvrs.map((spvrName) => (
                  <React.Fragment key={spvrName}>
                    {/* Supervisor Header Row */}
                    <tr className="bg-[#1e293b]/80">
                      <td colSpan="8" className="py-3 px-6 font-bold text-blue-400 text-sm tracking-wider uppercase border-y border-slate-700/50">
                        {spvrName}
                      </td>
                    </tr>

                    {/* Tickets for this Supervisor */}
                    {groupedTickets[spvrName].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '')).map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-4 px-6 pl-10 text-sm">
                          <div className="font-medium text-slate-200">{ticket.fullName || 'N/A'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-mono text-sm text-blue-400 font-medium">{ticket.transactionId}</div>
                        </td>
                        <td className="py-4 px-6 text-sm">
                          <span className="text-slate-300">
                            {formatDrawTime(ticket.drawTime)} {ticket.drawDate ? ticket.drawDate.split(' ')[0] : 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-xs font-bold text-slate-300">{ticket.betCode}</span>
                        </td>
                        <td className="py-4 px-6 text-sm">
                          <span className="text-white font-bold">{ticket.betNo}</span>
                        </td>
                        <td className="py-4 px-6 text-right font-medium text-slate-300">
                          ₱{parseFloat(ticket.betAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="font-bold text-emerald-400">
                            ₱{parseFloat(ticket.winAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTicketStatus(ticket.transactionId).className}`}>
                            {getTicketStatus(ticket.transactionId).text}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50 bg-[#1e293b]/50">
                <div className="text-sm text-slate-400">
                  Showing <span className="font-medium text-white">{(page - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-white">{Math.min(page * itemsPerPage, sortedSpvrs.length)}</span> of <span className="font-medium text-white">{sortedSpvrs.length}</span> Supervisors
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm font-medium rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="text-sm font-medium text-slate-400 px-2">
                    Page {page} of {totalPages}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm font-medium rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
