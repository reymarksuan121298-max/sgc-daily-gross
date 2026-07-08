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

  // Default to today for the bets date range
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const getApiConfig = () => {
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

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6">
      {/* Tellers List Sidebar */}
      <div className="w-1/3 bg-cardBg border border-slate-700/50 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-700/50">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            Active Tellers
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bets.map((bet, idx) => (
                    <div key={idx} className="bg-[#111827] border border-slate-700 p-4 rounded-lg hover:border-indigo-500/30 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded">
                          {bet.transactionId}
                        </div>
                        {bet.isVoid === 1 ? (
                          <span className="text-xs font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">VOID</span>
                        ) : (
                          <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">ACTIVE</span>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-end mt-4">
                        <div>
                          <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Draw: {bet.drawTime}
                          </p>
                          <p className="text-[10px] text-slate-500">{bet.created_at}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Amount</p>
                          <p className="text-lg font-bold text-white">₱{Number(bet.totalBetAmount).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
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
    </div>
  );
}
