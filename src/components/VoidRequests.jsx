import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { Search, Calendar, CheckSquare, Square, CheckCircle, Check, Clock, AlertCircle, RefreshCw, XCircle } from 'lucide-react';
import { clsx } from 'clsx';

export default function VoidRequests({ currentPage }) {
  const [voidRequests, setVoidRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'approved', 'rejected'
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Modal State
  const [selectedReviewRequest, setSelectedReviewRequest] = useState(null);
  const [reviewDetails, setReviewDetails] = useState([]);
  const [loadingReviewDetails, setLoadingReviewDetails] = useState(false);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [drawTimeFilter, setDrawTimeFilter] = useState('ALL');

  const getApiConfig = () => {
    // Determine API based on current page or default to Cotabato/Imperial
    if (currentPage === 'void_req_mag') {
      return {
        authHeader: { headers: { 'Authorization': 'Bearer 142725|tF7k4j0Gy0FMkJJnv43H8nkONO6E3BELhnAPANjM' } },
        baseUrl: 'https://stl-mag-api.com/api',
        idParam: '2'
      };
    }
    // Default to Cotabato (Imperial) using the provided token in the prompt
    return {
      authHeader: { headers: { 'Authorization': 'Bearer 56486|7iG9DVT3yUC9nYkhuyCWABQuv9rAJvsJml9VBSV6' } },
      baseUrl: 'https://stl-cotabato-api.com/api',
      idParam: '2'
    };
  };

  const fetchVoidRequests = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    if (!isBackground) setError(null);
    try {
      const { authHeader, baseUrl, idParam } = getApiConfig();
      const response = await axios.get(
        `${baseUrl}/teller/void_request?id=${idParam}&from=${fromDate}&to=${toDate}&drawTimeFilter=${drawTimeFilter}`, 
        authHeader
      );
      if (response.data && Array.isArray(response.data.data)) {
        setVoidRequests(response.data.data);
      } else if (response.data && Array.isArray(response.data)) {
        setVoidRequests(response.data);
      } else {
        setVoidRequests([]);
      }
    } catch (err) {
      console.error('Failed to fetch void requests:', err);
      if (!isBackground) setError('Failed to fetch void requests. Please check your connection and try again.');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoidRequests(false);

    // Set up live monitoring polling every 10 seconds
    const intervalId = setInterval(() => {
      fetchVoidRequests(true);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [fromDate, toDate, drawTimeFilter, currentPage]);

  const [amounts, setAmounts] = useState({});
  const fetchingAmountsRef = useRef(new Set());
  const requestQueue = useRef([]);
  const isFetchingRef = useRef(false);
  const unmountedRef = useRef(false);


  const pendingCount = voidRequests.filter(req => req.is_approve === 0).length;
  const approvedCount = voidRequests.filter(req => req.is_approve === 1).length;
  const rejectedCount = voidRequests.filter(req => req.is_approve === 2).length;

  const filteredRequests = useMemo(() => {
    let targetApproveStatus = 0;
    if (activeTab === 'approved') targetApproveStatus = 1;
    if (activeTab === 'rejected') targetApproveStatus = 2;

    let filtered = voidRequests.filter(req => 
      req.is_approve === targetApproveStatus && (
        req.transactionId?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        req.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.reason?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
    
    // Sort FIFO (First In First Out) - Oldest first
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      if (dateA === dateB) {
        return (a.id || 0) - (b.id || 0);
      }
      return dateA - dateB;
    });
    
    return filtered;
  }, [voidRequests, searchQuery, activeTab, amounts]);

  useEffect(() => {
    unmountedRef.current = false;
    return () => { unmountedRef.current = true; };
  }, []);

  const processQueue = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const { authHeader, baseUrl } = getApiConfig();
    
    while (requestQueue.current.length > 0) {
      if (unmountedRef.current) break;
      const batch = requestQueue.current.splice(0, 20);
      
      const batchResults = await Promise.all(batch.map(async (req) => {
        try {
          const response = await axios.get(`${baseUrl}/teller/bet/${req.transactionId}`, authHeader);
          let betItems = [];
          if (response.data && Array.isArray(response.data.data)) {
            betItems = response.data.data;
          } else if (response.data && Array.isArray(response.data)) {
            betItems = response.data;
          }
          
          if (betItems.length > 0) {
            const totalAmount = betItems.reduce((sum, item) => sum + Number(item.betAmount || 0), 0);
            return { id: req.transactionId, amount: totalAmount };
          }
          return { id: req.transactionId, amount: 0 };
        } catch (err) {
          return { id: req.transactionId, amount: null };
        }
      }));

      if (unmountedRef.current) break;

      setAmounts(prev => {
        const next = { ...prev };
        let hasChanges = false;
        batchResults.forEach(res => {
          if (res) {
            next[res.id] = res.amount;
            hasChanges = true;
          }
        });
        return hasChanges ? next : prev;
      });
    }

    isFetchingRef.current = false;
  };

  useEffect(() => {
    if (activeTab !== 'pending') return;

    const newRequests = filteredRequests.filter(req => 
      amounts[req.transactionId] === undefined && 
      !fetchingAmountsRef.current.has(req.transactionId)
    );

    if (newRequests.length > 0) {
      newRequests.forEach(req => {
        fetchingAmountsRef.current.add(req.transactionId);
        requestQueue.current.push(req);
      });
      processQueue();
    }
  }, [filteredRequests, activeTab]);

  const handleBulkApprove = async () => {
    if (filteredRequests.length === 0) return;
    
    setIsApproving(true);
    const { authHeader, baseUrl } = getApiConfig();
    
    try {
      // Loop through filtered IDs and send individual PUT requests
      const promises = filteredRequests.map(async (req) => {
        // Approve the void request
        await axios.put(`${baseUrl}/teller/void_request/${req.id}`, { status: 1, is_approve: 1 }, authHeader);
        // Automatically void the transaction ticket
        try {
          await axios.put(`${baseUrl}/admin/void/${req.transactionId}`, { isVoid: 1 }, authHeader);
        } catch (voidErr) {
          console.error(`Failed to void ticket ${req.transactionId}:`, voidErr);
        }
      });
      
      await Promise.all(promises);
      
      // Refresh the data after approval
      await fetchVoidRequests();
      showToast(`Successfully bulk approved ${promises.length} void requests!`);
    } catch (err) {
      console.error('Error during bulk approval:', err);
      showToast('An error occurred during bulk approval.', 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReviewClick = async (req) => {
    setSelectedReviewRequest(req);
    setLoadingReviewDetails(true);
    setReviewDetails([]);
    try {
      const { authHeader, baseUrl } = getApiConfig();
      const response = await axios.get(`${baseUrl}/teller/bet/${req.transactionId}`, authHeader);
      if (response.data && Array.isArray(response.data.data)) {
        setReviewDetails(response.data.data);
      } else if (response.data && Array.isArray(response.data)) {
        setReviewDetails(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch transaction details:', err);
    } finally {
      setLoadingReviewDetails(false);
    }
  };

  const handleModalApprove = async () => {
    if (!selectedReviewRequest) return;
    const id = selectedReviewRequest.id;
    setIsApproving(true);
    const { authHeader, baseUrl } = getApiConfig();
    try {
      // Approve the void request
      await axios.put(`${baseUrl}/teller/void_request/${id}`, { status: 1, is_approve: 1 }, authHeader);
      
      // Automatically void the transaction ticket
      try {
        await axios.put(`${baseUrl}/admin/void/${selectedReviewRequest.transactionId}`, { isVoid: 1 }, authHeader);
      } catch (voidErr) {
        console.error(`Failed to void ticket ${selectedReviewRequest.transactionId}:`, voidErr);
      }

      await fetchVoidRequests();
      setSelectedReviewRequest(null);
      showToast('Void request successfully approved!');
    } catch (err) {
      console.error(`Failed to approve ${id}`, err);
      showToast('An error occurred while approving the request.', 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleModalReject = async () => {
    if (!selectedReviewRequest) return;
    const id = selectedReviewRequest.id;
    setIsApproving(true);
    const { authHeader, baseUrl } = getApiConfig();
    try {
      await axios.put(`${baseUrl}/teller/void_request/${id}`, { status: 2, is_approve: 2 }, authHeader);
      await fetchVoidRequests();
      setSelectedReviewRequest(null);
      showToast('Void request successfully rejected!');
    } catch (err) {
      console.error(`Failed to reject ${id}`, err);
      showToast('An error occurred while rejecting the request.', 'error');
    } finally {
      setIsApproving(false);
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
    <div className="flex flex-col h-[calc(100vh-140px)] bg-cardBg border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl relative">
      
      {/* Toast Notification */}
      <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border transition-all duration-300 transform ${
        toast.show ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-8 opacity-0 scale-95 pointer-events-none'
      } ${
        toast.type === 'success' ? 'bg-[#111827] border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-[#111827] border-rose-500/50 shadow-[0_0_20px_rgba(243,24,96,0.3)]'
      }`}>
        {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
        <span className="font-semibold text-slate-200">{toast.message}</span>
      </div>

      {/* Header & Controls */}
      <div className="p-5 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 p-2 rounded-lg">
              <CheckCircle className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Void Requests</h2>
              <p className="text-sm text-slate-400">Manage and approve teller void transactions</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Draw Time Filter */}
            <div className="flex items-center bg-[#111827] border border-slate-700 rounded-lg px-3 py-2">
              <Clock className="w-4 h-4 text-slate-400 mr-2" />
              <select 
                value={drawTimeFilter}
                onChange={(e) => setDrawTimeFilter(e.target.value)}
                className="bg-transparent text-sm text-slate-200 outline-none appearance-none pr-4 cursor-pointer"
              >
                <option value="ALL" className="bg-[#111827]">All Draws</option>
                <option value="10:30" className="bg-[#111827]">10:30 AM</option>
                <option value="14" className="bg-[#111827]">2:00 PM</option>
                <option value="17" className="bg-[#111827]">5:00 PM</option>
                <option value="20" className="bg-[#111827]">8:00 PM</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="flex items-center bg-[#111827] border border-slate-700 rounded-lg px-3 py-2">
              <Calendar className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-sm text-slate-200 outline-none w-[110px] cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
            <span className="text-slate-500 font-medium">to</span>
            <div className="flex items-center bg-[#111827] border border-slate-700 rounded-lg px-3 py-2">
              <Calendar className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-sm text-slate-200 outline-none w-[110px] cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>

            {/* Refresh Button */}
            <button 
              onClick={() => fetchVoidRequests(false)}
              disabled={loading}
              className="p-2 bg-[#111827] border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800 rounded-lg text-slate-300 transition-all disabled:opacity-50 group"
              title="Refresh Data"
            >
              <RefreshCw className={clsx("w-5 h-5", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Tab Cards */}
        <div className="mt-6 flex flex-wrap gap-5 items-center">
          {/* Pending Card */}
          <button
            onClick={() => setActiveTab('pending')}
            className={`relative flex items-center h-11 bg-[#111827] rounded-lg border ${activeTab === 'pending' ? 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'border-slate-700/50 hover:border-slate-600'} transition-all group`}
          >
            <div className="flex items-center gap-2 px-4 bg-[#111827] rounded-l-lg h-full z-10">
              <div className="bg-amber-500 rounded-full text-white p-0.5 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" strokeWidth={3} />
              </div>
              <span className="text-sm font-semibold text-slate-200">Pending</span>
            </div>
            <div className={`w-12 h-full rounded-r-lg z-0 transition-colors ${activeTab === 'pending' ? 'bg-amber-500/20' : 'bg-amber-500/5 group-hover:bg-amber-500/10'}`}></div>
            <div className="absolute -top-2.5 -right-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm z-20 border-[3px] border-[#1e293b]">
              {pendingCount}
            </div>
          </button>

          {/* Approved Card */}
          <button
            onClick={() => setActiveTab('approved')}
            className={`relative flex items-center h-11 bg-[#111827] rounded-lg border ${activeTab === 'approved' ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'border-slate-700/50 hover:border-slate-600'} transition-all group`}
          >
            <div className="flex items-center gap-2 px-4 bg-[#111827] rounded-l-lg h-full z-10">
              <CheckCircle className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
              <span className="text-sm font-semibold text-slate-200">Approved</span>
            </div>
            <div className={`w-12 h-full rounded-r-lg z-0 transition-colors ${activeTab === 'approved' ? 'bg-emerald-500/20' : 'bg-emerald-500/5 group-hover:bg-emerald-500/10'}`}></div>
            <div className="absolute -top-2.5 -right-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm z-20 border-[3px] border-[#1e293b]">
              {approvedCount}
            </div>
          </button>

          {/* Rejected Card */}
          <button
            onClick={() => setActiveTab('rejected')}
            className={`relative flex items-center h-11 bg-[#111827] rounded-lg border ${activeTab === 'rejected' ? 'border-rose-500 shadow-[0_0_10px_rgba(243,24,96,0.2)]' : 'border-slate-700/50 hover:border-slate-600'} transition-all group`}
          >
            <div className="flex items-center gap-2 px-4 bg-[#111827] rounded-l-lg h-full z-10">
              <XCircle className="w-4 h-4 text-rose-500" strokeWidth={2.5} />
              <span className="text-sm font-semibold text-slate-200">Rejected</span>
            </div>
            <div className={`w-12 h-full rounded-r-lg z-0 transition-colors ${activeTab === 'rejected' ? 'bg-rose-500/20' : 'bg-rose-500/5 group-hover:bg-rose-500/10'}`}></div>
            <div className="absolute -top-2.5 -right-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm z-20 border-[3px] border-[#1e293b]">
              {rejectedCount}
            </div>
          </button>
        </div>

        {/* Toolbar row 2 */}
        <div className="mt-5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, name, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111827] text-sm text-slate-200 rounded-lg pl-9 pr-4 py-2.5 border border-slate-700 focus:outline-none focus:border-indigo-500/50 transition-colors shadow-inner"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-sm text-slate-400 bg-[#111827] px-3 py-1.5 rounded-md border border-slate-700/50">
              Total Shown: <strong className="text-indigo-400">{filteredRequests.length}</strong>
            </span>
            {activeTab === 'pending' && (
              <button
                onClick={handleBulkApprove}
                disabled={filteredRequests.length === 0 || isApproving}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none outline-none"
              >
                {isApproving ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Approving...</>
                ) : (
                  <><CheckSquare className="w-4 h-4" /> Bulk Approve</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-[#0f172a]/50">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mb-4 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
            <p className="font-medium tracking-wide">Loading requests...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-rose-400 p-8 text-center bg-rose-500/5 m-4 rounded-xl border border-rose-500/10">
            <AlertCircle className="w-12 h-12 mb-3 opacity-80" />
            <p>{error}</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
            <CheckCircle className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">No void requests found</p>
            <p className="text-sm mt-1">Try adjusting your filters or date range</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700 shadow-sm backdrop-blur-sm bg-opacity-90">
              <tr>
                <th className="py-4 px-4 font-semibold text-xs text-slate-400 uppercase tracking-wider">Transaction ID</th>
                <th className="py-4 px-4 font-semibold text-xs text-slate-400 uppercase tracking-wider">Teller</th>
                <th className="py-4 px-4 font-semibold text-xs text-slate-400 uppercase tracking-wider">Draw Time</th>
                <th className="py-4 px-4 font-semibold text-xs text-slate-400 uppercase tracking-wider">Reason</th>
                {activeTab === 'pending' && (
                  <th className="py-4 px-4 font-semibold text-xs text-slate-400 uppercase tracking-wider">Amount</th>
                )}
                <th className="py-4 px-4 font-semibold text-xs text-slate-400 uppercase tracking-wider">Date/Time</th>
                <th className="py-4 px-4 font-semibold text-xs text-slate-400 uppercase tracking-wider text-center">Status</th>
                <th className="py-4 px-4 font-semibold text-xs text-slate-400 uppercase tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredRequests.map((req) => {
                const isApproved = req.is_approve === 1;
                
                return (
                  <tr 
                    key={req.id} 
                    className="transition-colors group hover:bg-slate-800/40"
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono text-sm font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 inline-block">
                        {req.transactionId}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-slate-200">{req.fullName || req.username}</div>
                      <div className="text-xs text-slate-500">ID: {req.tellerId}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-300 font-medium">
                      {formatDrawTime(req.drawTime)}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-slate-300 max-w-xs truncate" title={req.reason}>
                        {req.reason || '-'}
                      </p>
                    </td>
                    {activeTab === 'pending' && (
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-emerald-400">
                          {amounts[req.transactionId] !== undefined && amounts[req.transactionId] !== null ? 
                            `₱${Number(amounts[req.transactionId]).toLocaleString(undefined, { minimumFractionDigits: 2 })}` 
                            : (amounts[req.transactionId] === null ? '-' : '')}
                        </div>
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <div className="text-sm text-slate-300">{req.created_at?.split(' ')[0]}</div>
                      <div className="text-xs text-slate-500">{req.created_at?.split(' ')[1]}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                          <CheckCircle className="w-3 h-3" /> Approved
                        </span>
                      ) : req.is_approve === 2 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 shadow-[0_0_10px_rgba(243,24,96,0.1)]">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleReviewClick(req)}
                        className={`px-4 py-1.5 ${req.is_approve === 0 ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20' : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 border-slate-600/50'} border text-sm font-medium rounded-lg transition-colors`}
                      >
                        {req.is_approve === 0 ? 'Review' : 'View'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Review Modal */}
      {selectedReviewRequest && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => !isApproving && setSelectedReviewRequest(null)}
        >
          <div 
            className="bg-[#1e293b] border border-slate-700/50 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-slate-700/50 bg-slate-800/50 shrink-0">
              <h3 className="text-xl font-bold text-white text-center w-full">
                Review Void Request
              </h3>
              <button 
                onClick={() => !isApproving && setSelectedReviewRequest(null)}
                disabled={isApproving}
                className="text-slate-400 hover:text-white transition-colors absolute right-5"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-1 text-sm text-slate-300 mb-6">
                <p><span className="text-slate-400">Teller:</span> <span className="font-medium text-slate-200">{selectedReviewRequest.fullName || '-'}</span></p>
                <p><span className="text-slate-400">Username:</span> <span className="font-medium text-slate-200">{selectedReviewRequest.username || '-'}</span></p>
                <p><span className="text-slate-400">Transaction ID:</span> <span className="font-mono text-indigo-400 font-medium">{selectedReviewRequest.transactionId}</span></p>
                <p><span className="text-slate-400">Draw:</span> <span className="font-medium text-slate-200">{formatDrawTime(selectedReviewRequest.drawTime)}</span></p>
                <p><span className="text-slate-400">Bet Time:</span> <span className="font-medium text-slate-200">{reviewDetails.length > 0 ? reviewDetails[0].created_at : '-'}</span></p>
                <p><span className="text-slate-400">Void Requested at:</span> <span className="font-medium text-slate-200">{selectedReviewRequest.created_at}</span></p>
                <p className="mt-2"><span className="text-slate-400">Reason:</span> <span className="font-medium text-rose-300">{selectedReviewRequest.reason}</span></p>
              </div>

              {loadingReviewDetails ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                <>
                  <table className="w-full text-left text-sm border-collapse mb-6">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="pb-3 text-slate-400 font-semibold uppercase tracking-wider text-xs">Game</th>
                        <th className="pb-3 text-slate-400 font-semibold uppercase tracking-wider text-xs">Number</th>
                        <th className="pb-3 text-slate-400 font-semibold uppercase tracking-wider text-xs">Amount</th>
                        <th className="pb-3 text-slate-400 font-semibold uppercase tracking-wider text-xs">Soldout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {reviewDetails.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 text-slate-300 font-medium">{item.betCode}</td>
                          <td className="py-3 text-white font-bold">{item.betNo}</td>
                          <td className="py-3 text-slate-300">{Number(item.betAmount).toString()}</td>
                          <td className="py-3 text-slate-300">No</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="border-t border-slate-700/50 pt-4 mb-8">
                    <p className="text-lg font-bold text-white">
                      Total Amount: <span className="text-emerald-400">{reviewDetails.reduce((sum, item) => sum + Number(item.betAmount), 0).toString()}</span>
                    </p>
                  </div>
                </>
              )}

              {selectedReviewRequest.is_approve === 0 && (
                <div className="flex flex-col gap-3 mt-auto">
                  <button
                    onClick={handleModalApprove}
                    disabled={isApproving}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isApproving ? <RefreshCw className="w-5 h-5 animate-spin" /> : null}
                    Approve
                  </button>
                  <button
                    onClick={handleModalReject}
                    disabled={isApproving}
                    className="w-full py-3 bg-rose-500 hover:bg-rose-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isApproving ? <RefreshCw className="w-5 h-5 animate-spin" /> : null}
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
