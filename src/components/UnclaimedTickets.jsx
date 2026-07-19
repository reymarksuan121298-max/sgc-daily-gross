import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { RefreshCw, Search, Filter, Copy, Check } from 'lucide-react';
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
  const [isCopying, setIsCopying] = useState(false);

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

  const handleBulkCopy = () => {
    let copyText = '';
    
    sortedSpvrs.forEach(spvrName => {
      copyText += `${spvrName}\n`;
      copyText += `Teller\tDraw\tBet No.\tBet Code\tBet Amount\tWin Amount\n`;
      
      const spvrTickets = groupedTickets[spvrName].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
      spvrTickets.forEach(ticket => {
        const teller = ticket.fullName || 'N/A';
        const draw = `${formatDrawTime(ticket.drawTime)} ${ticket.drawDate ? ticket.drawDate.split(' ')[0] : 'N/A'}`;
        const betNo = ticket.betNo || '';
        const betCode = ticket.betCode || '';
        const betAmount = ticket.betAmount || 0;
        const winAmount = ticket.winAmount || 0;
        
        copyText += `${teller}\t${draw}\t${betNo}\t${betCode}\t${betAmount}\t${winAmount}\n`;
      });
      copyText += `\n`;
    });

    navigator.clipboard.writeText(copyText.trimEnd()).then(() => {
      setIsCopying(true);
      setTimeout(() => setIsCopying(false), 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
      alert("Failed to copy data");
    });
  };

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
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input
              type="text"
              placeholder="Search ID, Teller, Bet No, or Code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-appBg border border-border-divider rounded-lg pl-9 pr-4 py-2.5 text-sm w-full md:w-64 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            onClick={handleBulkCopy}
            disabled={loading || filteredTickets.length === 0}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600 border border-blue-500 hover:bg-blue-700 transition-colors disabled:opacity-50 text-textPrimary text-sm font-medium"
            title="Bulk Copy"
          >
            {isCopying ? (
              <>
                <Check className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Data
              </>
            )}
          </button>
          <button
            onClick={fetchTickets}
            disabled={loading}
            className="flex items-center justify-center p-2.5 rounded-lg bg-surface-header border border-border-divider hover:bg-surface-hover transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 text-textSecondary ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {!loading && !error && filteredTickets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-cardBg border border-border-divider/50 rounded-2xl p-6 shadow-xl flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <RefreshCw className="w-16 h-16 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-textSecondary uppercase tracking-wider mb-1">Total Unclaimed Win Amount</p>
            <p className="text-3xl font-bold text-emerald-400">₱{filteredTickets.reduce((acc, curr) => acc + parseFloat(curr.winAmount || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          </div>
          <div className="bg-cardBg border border-border-divider/50 rounded-2xl p-6 shadow-xl flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Filter className="w-16 h-16 text-textPrimary" />
            </div>
            <p className="text-sm font-medium text-textSecondary uppercase tracking-wider mb-1">Total Pending Tickets</p>
            <p className="text-3xl font-bold text-textPrimary">{filteredTickets.length}</p>
          </div>
          <div className="bg-cardBg border border-border-divider/50 rounded-2xl p-6 shadow-xl flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Search className="w-16 h-16 text-blue-400" />
            </div>
            <p className="text-sm font-medium text-textSecondary uppercase tracking-wider mb-1">Affected Supervisors</p>
            <p className="text-3xl font-bold text-blue-400">{sortedSpvrs.length}</p>
          </div>
        </div>
      )}

      <div className="bg-cardBg border border-border-divider/50 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64 text-textSecondary">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#10b981] mr-3"></div>
            Loading Data...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500">{error}</div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-textSecondary">No unclaimed tickets found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-header/50 border-b border-border-divider">
                  <th className="py-4 px-6 font-semibold text-xs text-textSecondary uppercase tracking-wider">Teller</th>
                  <th className="py-4 px-6 font-semibold text-xs text-textSecondary uppercase tracking-wider">Transaction ID</th>
                  <th className="py-4 px-6 font-semibold text-xs text-textSecondary uppercase tracking-wider">Draw</th>
                  <th className="py-4 px-6 font-semibold text-xs text-textSecondary uppercase tracking-wider">Game Code</th>
                  <th className="py-4 px-6 font-semibold text-xs text-textSecondary uppercase tracking-wider">Bet No</th>
                  <th className="py-4 px-6 font-semibold text-xs text-textSecondary uppercase tracking-wider text-right">Bet Amt</th>
                  <th className="py-4 px-6 font-semibold text-xs text-textSecondary uppercase tracking-wider text-right">Win Amt</th>
                  <th className="py-4 px-6 font-semibold text-xs text-textSecondary uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-divider/50">
                {paginatedSpvrs.map((spvrName) => (
                  <React.Fragment key={spvrName}>
                    {/* Supervisor Header Row */}
                    <tr className="bg-surface-hover/80">
                      <td colSpan="8" className="py-3 px-6 font-bold text-blue-400 text-sm tracking-wider uppercase border-y border-border-divider">
                        {spvrName}
                      </td>
                    </tr>

                    {/* Tickets for this Supervisor */}
                    {groupedTickets[spvrName].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '')).map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-surface-hover/20 transition-colors">
                        <td className="py-4 px-6 pl-10 text-sm">
                          <div className="font-medium text-textPrimary">{ticket.fullName || 'N/A'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-mono text-sm text-blue-400 font-medium">{ticket.transactionId}</div>
                        </td>
                        <td className="py-4 px-6 text-sm">
                          <span className="text-textSecondary">
                            {formatDrawTime(ticket.drawTime)} {ticket.drawDate ? ticket.drawDate.split(' ')[0] : 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm">
                          <span className="bg-surface-header px-2 py-0.5 rounded text-xs font-bold text-textSecondary">{ticket.betCode}</span>
                        </td>
                        <td className="py-4 px-6 text-sm">
                          <span className="text-textPrimary font-bold">{ticket.betNo}</span>
                        </td>
                        <td className="py-4 px-6 text-right font-medium text-textSecondary">
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
              <div className="flex items-center justify-between px-6 py-4 border-t border-border-divider bg-surface-hover">
                <div className="text-sm text-textSecondary">
                  Showing <span className="font-medium text-textPrimary">{(page - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-textPrimary">{Math.min(page * itemsPerPage, sortedSpvrs.length)}</span> of <span className="font-medium text-textPrimary">{sortedSpvrs.length}</span> Supervisors
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm font-medium rounded bg-surface-header border border-border-divider text-textSecondary hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="text-sm font-medium text-textSecondary px-2">
                    Page {page} of {totalPages}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm font-medium rounded bg-surface-header border border-border-divider text-textSecondary hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
