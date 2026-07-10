import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, User, Calendar, ReceiptText, Clock, AlertCircle } from 'lucide-react';

export default function ActiveTellers({ currentPage, selectedEndDate }) {
  const [tellers, setTellers] = useState([]);
  const [selectedTeller, setSelectedTeller] = useState(null);
  const [bets, setBets] = useState([]);
  const [loadingTellers, setLoadingTellers] = useState(false);
  const [loadingBets, setLoadingBets] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionDetails, setTransactionDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Default to 7 days ago to show recent transactions
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

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
      <div className="w-1/3 bg-cardBg border border-slate-700/50 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-700/50">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            Teller Transactions
            <span className="ml-auto text-xs font-normal bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
              {tellers.length}
            </span>
          </h2>
          
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tellers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111827] text-sm text-slate-200 rounded-lg pl-9 pr-4 py-2 border border-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
            />
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
            <div className="p-8 text-center text-slate-400 text-sm">No tellers found.</div>
          ) : (
            filteredTellers.map((teller) => (
              <button
                key={teller.id}
                onClick={() => setSelectedTeller(teller)}
                className={`w-full text-left p-3 rounded-lg transition-all flex items-start gap-3 ${
                  selectedTeller?.id === teller.id 
                    ? 'bg-blue-600/20 border border-blue-500/30' 
                    : 'hover:bg-slate-800 border border-transparent'
                }`}
              >
                <div className={`w-2 h-2 mt-1.5 rounded-full ${teller.isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                <div>
                  <div className={`font-medium text-sm ${selectedTeller?.id === teller.id ? 'text-blue-400' : 'text-slate-200'}`}>
                    {teller.fullName || teller.username}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{teller.outlet || 'No Outlet'} • {teller.location}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Bets Details Area */}
      <div className="flex-1 bg-cardBg border border-slate-700/50 rounded-xl overflow-hidden flex flex-col">
        {selectedTeller ? (
          <>
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/30">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ReceiptText className="w-5 h-5 text-indigo-400" />
                  Bets for {selectedTeller.fullName || selectedTeller.username}
                </h2>
                <p className="text-sm text-slate-400 mt-1">Outlet: {selectedTeller.outlet} | ID: {selectedTeller.id}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#111827] border border-slate-700 rounded-lg px-3 py-1.5">
                  <Calendar className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-transparent text-sm text-slate-200 outline-none w-[110px]"
                  />
                </div>
                <span className="text-slate-500">to</span>
                <div className="flex items-center bg-[#111827] border border-slate-700 rounded-lg px-3 py-1.5">
                  <Calendar className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-transparent text-sm text-slate-200 outline-none w-[110px]"
                  />
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            {!loadingBets && bets.length > 0 && (
              <div className="grid grid-cols-4 gap-4 p-4 border-b border-slate-700/50 bg-slate-800/20">
                <div className="bg-[#111827] border border-slate-700 rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Amount</p>
                  <p className="text-xl font-bold text-emerald-400">₱{bets.reduce((acc, curr) => acc + (curr.isVoid ? 0 : Number(curr.totalBetAmount)), 0).toLocaleString()}</p>
                </div>
                <div className="bg-[#111827] border border-slate-700 rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Bets</p>
                  <p className="text-xl font-bold text-white">{bets.length}</p>
                </div>
                <div className="bg-[#111827] border border-slate-700 rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Active Bets</p>
                  <p className="text-xl font-bold text-blue-400">{bets.filter(b => !b.isVoid).length}</p>
                </div>
                <div className="bg-[#111827] border border-slate-700 rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Void Bets</p>
                  <p className="text-xl font-bold text-rose-400">{bets.filter(b => b.isVoid).length}</p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              {loadingBets ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
                  Loading bets...
                </div>
              ) : bets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <ReceiptText className="w-12 h-12 text-slate-600 mb-3 opacity-50" />
                  <p>No bets found for this date range.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-700/50">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800/50 border-b border-slate-700/50">
                        <th className="py-3 px-4 font-semibold text-xs text-slate-400 uppercase tracking-wider">Transaction ID</th>
                        <th className="py-3 px-4 font-semibold text-xs text-slate-400 uppercase tracking-wider">Draw</th>
                        <th className="py-3 px-4 font-semibold text-xs text-slate-400 uppercase tracking-wider">Time</th>
                        <th className="py-3 px-4 font-semibold text-xs text-slate-400 uppercase tracking-wider text-right">Amount</th>
                        <th className="py-3 px-4 font-semibold text-xs text-slate-400 uppercase tracking-wider text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {bets.map((bet, idx) => (
                        <tr 
                          key={idx} 
                          onClick={() => fetchTransactionDetails(bet.transactionId)}
                          className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-4">
                            <div className="font-mono text-sm text-indigo-400 font-medium group-hover:text-indigo-300 transition-colors">{bet.transactionId}</div>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-300">
                            {formatDrawTime(bet.drawTime)}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-400">
                            {bet.created_at}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-white">
                            ₱{Number(bet.totalBetAmount).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {bet.isVoid === 1 ? (
                              <span className="text-xs font-medium text-rose-400 bg-rose-500/10 px-2 py-1 rounded-full border border-rose-500/20">VOID</span>
                            ) : (
                              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">ACTIVE</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {bets.length > 0 && !loadingBets && (
              <div className="p-4 border-t border-slate-700/50 bg-slate-800/30 flex justify-between items-center">
                <span className="text-sm text-slate-400">Total Bets: <strong className="text-white">{bets.length}</strong></span>
                <span className="text-sm text-slate-400">
                  Total Amount: <strong className="text-emerald-400 text-lg">₱{bets.reduce((acc, curr) => acc + (curr.isVoid ? 0 : Number(curr.totalBetAmount)), 0).toLocaleString()}</strong>
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <User className="w-16 h-16 text-slate-700 mb-4 opacity-50" />
            <p>Select a teller from the list to view their bets</p>
          </div>
        )}
      </div>

      {/* Bet Information Modal */}
      {selectedTransaction && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedTransaction(null)}
        >
          <div 
            className="bg-[#1e293b] border border-slate-700/50 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-slate-700/50 bg-slate-800/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-indigo-400" />
                Bet Information
              </h3>
              <button 
                onClick={() => setSelectedTransaction(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <AlertCircle className="w-5 h-5 opacity-0 absolute" /> {/* Hidden icon for spacing hack if needed */}
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
                  <div className="grid grid-cols-2 gap-4 mb-6 bg-[#111827] p-4 rounded-lg border border-slate-700/50 text-sm">
                    <p><span className="text-slate-500 block mb-1">Trans. ID:</span> <span className="font-mono text-indigo-400 font-medium text-base">{selectedTransaction}</span></p>
                    <p><span className="text-slate-500 block mb-1">Total Amount:</span> <span className="text-emerald-400 font-bold text-base">₱{transactionDetails.reduce((sum, item) => sum + Number(item.betAmount), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></p>
                    <p><span className="text-slate-500 block mb-1">Draw Time:</span> <span className="text-slate-200">{transactionDetails.length > 0 ? formatDrawTime(transactionDetails[0].drawTime) : ''}</span></p>
                    <p><span className="text-slate-500 block mb-1">Bet Time:</span> <span className="text-slate-200">{transactionDetails.length > 0 ? transactionDetails[0].created_at : ''}</span></p>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-700/50">
                          <th className="pb-3 text-slate-400 font-semibold uppercase tracking-wider text-xs">Bet Code</th>
                          <th className="pb-3 text-slate-400 font-semibold uppercase tracking-wider text-xs">Bet Number</th>
                          <th className="pb-3 text-slate-400 font-semibold uppercase tracking-wider text-xs text-right">Bet Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {transactionDetails.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 text-slate-300 font-medium">
                              <span className="bg-slate-800 px-2 py-1 rounded text-xs">{item.betCode}</span>
                            </td>
                            <td className="py-3 text-white font-bold">{item.betNo}</td>
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
      )}
    </div>
  );
}
