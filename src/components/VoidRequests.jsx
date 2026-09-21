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
  const [activeTab, setActiveTab] = useState('rejected'); // 'pending', 'approved', 'rejected'
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
  const formatDateStr = (d) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [fromDate, setFromDate] = useState(() => formatDateStr(new Date()));
  const [toDate, setToDate] = useState(() => formatDateStr(new Date()));
  const [drawTimeFilter, setDrawTimeFilter] = useState('ALL');

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

    // Only set up live monitoring polling if on pending tab (to avoid 429 rate limit on historical lookup)
    if (activeTab === 'pending') {
      const intervalId = setInterval(() => {
        fetchVoidRequests(true);
      }, 30000);
      return () => clearInterval(intervalId);
    }
  }, [fromDate, toDate, drawTimeFilter, currentPage, activeTab]);

  const [amounts, setAmounts] = useState({});
  const betDetailsCache = useRef({});
  const fetchingAmountsRef = useRef(new Set());
  const requestQueue = useRef([]);
  const isFetchingRef = useRef(false);
  const unmountedRef = useRef(false);
  const [modalError, setModalError] = useState(null);


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
  }, [voidRequests, searchQuery, activeTab]);

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
      const req = requestQueue.current.shift();
      if (!req) continue;

      try {
        const response = await axios.get(`${baseUrl}/teller/bet/${req.transactionId}`, authHeader);
        let betItems = [];
        if (response.data && Array.isArray(response.data.data)) {
          betItems = response.data.data;
        } else if (response.data && Array.isArray(response.data)) {
          betItems = response.data;
        }

        betDetailsCache.current[req.transactionId] = betItems;
        const totalAmount = betItems.reduce((sum, item) => sum + Number(item.betAmount || 0), 0);

        if (!unmountedRef.current) {
          setAmounts(prev => ({ ...prev, [req.transactionId]: totalAmount }));
        }
        // Polite delay between requests to never trigger Laravel 429 rate limit
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        if (err?.response?.status === 429) {
          // If rate limited, wait 5 seconds before attempting next
          fetchingAmountsRef.current.delete(req.transactionId);
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          setAmounts(prev => ({ ...prev, [req.transactionId]: null }));
        }
      }
    }

    isFetchingRef.current = false;
  };

  useEffect(() => {
    // Only auto-fetch amounts for pending void requests (max 30 items) so server 429 rate limit is never triggered
    if (activeTab !== 'pending') return;

    const newRequests = filteredRequests
      .slice(0, 30)
      .filter(req =>
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

  const formatDrawTime = (timeStr) => {
    if (!timeStr) return '';
    const str = String(timeStr).trim();
    if (str === '10:30' || str === '10:30:00' || str === '10.30') return '10:30AM';
    if (str === '14' || str === '14:00' || str === '2' || str === '2PM') return '2:00PM';
    if (str === '15' || str === '15:00' || str === '3' || str === '3PM') return '3:00PM';
    if (str === '17' || str === '17:00' || str === '5' || str === '5PM') return '5:00PM';
    if (str === '19' || str === '19:00' || str === '7' || str === '7PM') return '7:00PM';
    if (str === '21' || str === '21:00' || str === '9' || str === '9PM') return '9:00PM';

    if (str.includes(':')) {
      const parts = str.split(':');
      const hour = parseInt(parts[0], 10);
      const min = parts[1];
      if (!isNaN(hour)) {
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${min}${ampm}`;
      }
    }
    const hour = parseInt(str, 10);
    if (isNaN(hour)) return str;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}${ampm}`;
  };

  const handleBulkApprove = async () => {
    if (filteredRequests.length === 0) return;

    setIsApproving(true);
    const { authHeader, baseUrl } = getApiConfig();

    try {
      let successCount = 0;
      let failedCount = 0;

      // Process sequentially to completely avoid overwhelming the server
      for (const req of filteredRequests) {
        try {
          // Approve the void request in teller/void_request
          await axios.put(`${baseUrl}/teller/void_request/${req.id}`, { status: 1, is_approve: 1 }, authHeader);
          successCount++;

          // Small delay between requests to prevent rate limiting/server overload
          await new Promise(resolve => setTimeout(resolve, 250));
        } catch (reqErr) {
          console.error(`Failed to approve request ${req.id}:`, reqErr);
          failedCount++;
        }
      }

      // Additional small delay before fetching fresh data to let the server recover
      await new Promise(resolve => setTimeout(resolve, 800));

      // Refresh the data after approval
      await fetchVoidRequests();

      if (successCount > 0) {
        showToast(`Successfully bulk approved ${successCount} void requests!`);
      } else {
        showToast('Failed to approve requests. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Error during bulk approval:', err);
      showToast('An error occurred during bulk approval.', 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReviewClick = async (req) => {
    setSelectedReviewRequest(req);
    setModalError(null);

    // Use cached details if already fetched
    if (betDetailsCache.current[req.transactionId]) {
      setReviewDetails(betDetailsCache.current[req.transactionId]);
      setLoadingReviewDetails(false);
      return;
    }

    setLoadingReviewDetails(true);
    setReviewDetails([]);
    try {
      const { authHeader, baseUrl } = getApiConfig();
      const response = await axios.get(`${baseUrl}/teller/bet/${req.transactionId}`, authHeader);
      let betItems = [];
      if (response.data && Array.isArray(response.data.data)) {
        betItems = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        betItems = response.data;
      }
      betDetailsCache.current[req.transactionId] = betItems;
      setReviewDetails(betItems);
      const totalAmount = betItems.reduce((sum, item) => sum + Number(item.betAmount || 0), 0);
      setAmounts(prev => ({ ...prev, [req.transactionId]: totalAmount }));
    } catch (err) {
      console.error('Failed to fetch transaction details:', err);
      if (err?.response?.status === 429) {
        setModalError('Server is currently rate-limited. Please wait a few seconds and click Retry.');
      } else {
        setModalError('Failed to fetch transaction details. Please try again.');
      }
    } finally {
      setLoadingReviewDetails(false);
    }
  };

  const handleModalApprove = async () => {
    if (!selectedReviewRequest) return;
    const req = selectedReviewRequest;
    const id = req.id;
    setIsApproving(true);
    const { authHeader, baseUrl } = getApiConfig();
    try {
      // Approve the void request status
      await axios.put(`${baseUrl}/teller/void_request/${id}`, { status: 1, is_approve: 1 }, authHeader);

      await fetchVoidRequests();
      setSelectedReviewRequest(null);
      showToast('Void request successfully approved!');
    } catch (err) {
      console.error(`Failed to approve ${id}`, err);
      const errMsg = err?.response?.data?.message || err?.message || 'An error occurred while approving.';
      showToast(errMsg, 'error');
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

  return (
    <div className="flex flex-col h-auto lg:h-[calc(100vh-140px)] min-h-[calc(100vh-140px)] bg-cardBg border border-border-divider rounded-xl overflow-hidden shadow-2xl relative">

      {/* Toast Notification */}
      <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border transition-all duration-300 transform ${toast.show ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-8 opacity-0 scale-95 pointer-events-none'
        } ${toast.type === 'success' ? 'bg-surface border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-surface border-rose-500/50 shadow-[0_0_20px_rgba(243,24,96,0.3)]'
        }`}>
        {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
        <span className="font-semibold text-textPrimary">{toast.message}</span>
      </div>

      {/* Header & Controls */}
      <div className="p-5 border-b border-border-divider bg-surface-header/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 p-2 rounded-lg">
              <CheckCircle className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-textPrimary tracking-tight">Void Requests</h2>
              <p className="text-sm text-textSecondary">Manage and approve teller void transactions</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Date Presets */}
            <div className="flex items-center bg-surface border border-border-divider rounded-lg p-1 gap-1 shadow-sm text-xs">
              <button
                type="button"
                onClick={() => handleDatePreset('today')}
                className={clsx(
                  "px-2.5 py-1 rounded transition-colors font-medium",
                  fromDate === formatDateStr(new Date()) && toDate === formatDateStr(new Date())
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-textSecondary hover:text-textPrimary hover:bg-surface-hover"
                )}
                title="View Today's Void Requests"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('yesterday')}
                className={clsx(
                  "px-2.5 py-1 rounded transition-colors font-medium",
                  (() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    const yStr = formatDateStr(y);
                    return fromDate === yStr && toDate === yStr;
                  })()
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-textSecondary hover:text-textPrimary hover:bg-surface-hover"
                )}
                title="View Yesterday's Void Requests"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('last7')}
                className={clsx(
                  "px-2.5 py-1 rounded transition-colors font-medium hidden sm:inline-block",
                  (() => {
                    const past = new Date();
                    past.setDate(past.getDate() - 6);
                    return fromDate === formatDateStr(past) && toDate === formatDateStr(new Date());
                  })()
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-textSecondary hover:text-textPrimary hover:bg-surface-hover"
                )}
                title="View Last 7 Days Void Requests"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('thisMonth')}
                className={clsx(
                  "px-2.5 py-1 rounded transition-colors font-medium hidden md:inline-block",
                  (() => {
                    const now = new Date();
                    const first = new Date(now.getFullYear(), now.getMonth(), 1);
                    return fromDate === formatDateStr(first) && toDate === formatDateStr(now);
                  })()
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-textSecondary hover:text-textPrimary hover:bg-surface-hover"
                )}
                title="View This Month's Void Requests"
              >
                This Month
              </button>
            </div>

            {/* Date Range Inputs */}
            <div className="flex items-center bg-surface border border-border-divider rounded-lg px-2.5 py-1.5 gap-2 shadow-sm">
              <Calendar className="w-4 h-4 text-textSecondary" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-xs text-textPrimary outline-none cursor-pointer"
                title="From Date"
              />
              <span className="text-textSecondary text-xs">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-xs text-textPrimary outline-none cursor-pointer"
                title="To Date"
              />
            </div>

            {/* Draw Time Filter Selector */}
            <select
              value={drawTimeFilter}
              onChange={(e) => setDrawTimeFilter(e.target.value)}
              className="bg-surface border border-border-divider rounded-lg px-3 py-1.5 text-xs text-textPrimary outline-none cursor-pointer hover:border-indigo-500/50 shadow-sm"
              title="Filter by Draw Time"
            >
              <option value="ALL">All Draws</option>
              <option value="10:30">10:30 AM</option>
              <option value="14:00">2:00 PM</option>
              <option value="15:00">3:00 PM</option>
              <option value="17:00">5:00 PM</option>
              <option value="19:00">7:00 PM</option>
              <option value="21:00">9:00 PM</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={() => fetchVoidRequests(false)}
              disabled={loading}
              className="p-2 bg-surface border border-border-divider hover:border-indigo-500/50 hover:bg-surface-hover rounded-lg text-textSecondary transition-all disabled:opacity-50 group shadow-sm"
              title="Refresh Data"
            >
              <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Tab Cards */}
        <div className="mt-6 flex flex-wrap gap-5 items-center">
          {/* Pending Card */}
          <button
            onClick={() => setActiveTab('pending')}
            className={`relative flex items-center h-11 bg-surface rounded-lg border ${activeTab === 'pending' ? 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'border-border-divider hover:border-border-divider'} transition-all group`}
          >
            <div className="flex items-center gap-2 px-4 bg-surface rounded-l-lg h-full z-10">
              <div className="bg-amber-500 rounded-full text-textPrimary p-0.5 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" strokeWidth={3} />
              </div>
              <span className="text-sm font-semibold text-textPrimary">Pending</span>
            </div>
            <div className={`w-12 h-full rounded-r-lg z-0 transition-colors ${activeTab === 'pending' ? 'bg-amber-500/20' : 'bg-amber-500/5 group-hover:bg-amber-500/10'}`}></div>
            <div className="absolute -top-2.5 -right-2 bg-rose-500 text-textPrimary text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm z-20 border-[3px] border-[#1e293b]">
              {pendingCount}
            </div>
          </button>

          {/* Approved Card */}
          <button
            onClick={() => setActiveTab('approved')}
            className={`relative flex items-center h-11 bg-surface rounded-lg border ${activeTab === 'approved' ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'border-border-divider hover:border-border-divider'} transition-all group`}
          >
            <div className="flex items-center gap-2 px-4 bg-surface rounded-l-lg h-full z-10">
              <CheckCircle className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
              <span className="text-sm font-semibold text-textPrimary">Approved</span>
            </div>
            <div className={`w-12 h-full rounded-r-lg z-0 transition-colors ${activeTab === 'approved' ? 'bg-emerald-500/20' : 'bg-emerald-500/5 group-hover:bg-emerald-500/10'}`}></div>
            <div className="absolute -top-2.5 -right-2 bg-rose-500 text-textPrimary text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm z-20 border-[3px] border-[#1e293b]">
              {approvedCount}
            </div>
          </button>

          {/* Rejected Card */}
          <button
            onClick={() => setActiveTab('rejected')}
            className={`relative flex items-center h-11 bg-surface rounded-lg border ${activeTab === 'rejected' ? 'border-rose-500 shadow-[0_0_10px_rgba(243,24,96,0.2)]' : 'border-border-divider hover:border-border-divider'} transition-all group`}
          >
            <div className="flex items-center gap-2 px-4 bg-surface rounded-l-lg h-full z-10">
              <XCircle className="w-4 h-4 text-rose-500" strokeWidth={2.5} />
              <span className="text-sm font-semibold text-textPrimary">Rejected</span>
            </div>
            <div className={`w-12 h-full rounded-r-lg z-0 transition-colors ${activeTab === 'rejected' ? 'bg-rose-500/20' : 'bg-rose-500/5 group-hover:bg-rose-500/10'}`}></div>
            <div className="absolute -top-2.5 -right-2 bg-rose-500 text-textPrimary text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm z-20 border-[3px] border-[#1e293b]">
              {rejectedCount}
            </div>
          </button>
        </div>

        {/* Toolbar row 2 */}
        <div className="mt-5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-textSecondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, name, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface text-sm text-textPrimary rounded-lg pl-9 pr-4 py-2.5 border border-border-divider focus:outline-none focus:border-indigo-500/50 transition-colors shadow-inner"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-sm text-textSecondary bg-surface px-3 py-1.5 rounded-md border border-border-divider">
              Total Shown: <strong className="text-indigo-400">{filteredRequests.length}</strong>
            </span>
            {(() => {
              const totalAmountSum = filteredRequests.reduce((sum, req) => {
                const amt = amounts[req.transactionId];
                return sum + (typeof amt === 'number' ? amt : 0);
              }, 0);
              return (
                <span className="text-sm text-textSecondary bg-surface px-3 py-1.5 rounded-md border border-border-divider">
                  Total Amount: <strong className="text-emerald-400">₱{totalAmountSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </span>
              );
            })()}
            {activeTab === 'pending' && (
              <button
                onClick={handleBulkApprove}
                disabled={filteredRequests.length === 0 || isApproving}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-textPrimary font-medium rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none outline-none"
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
          <div className="flex flex-col items-center justify-center h-full text-textSecondary">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mb-4 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
            <p className="font-medium tracking-wide">Loading requests...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-rose-400 p-8 text-center bg-rose-500/5 m-4 rounded-xl border border-rose-500/10">
            <AlertCircle className="w-12 h-12 mb-3 opacity-80" />
            <p>{error}</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-textSecondary p-8 text-center">
            <CheckCircle className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">No void requests found</p>
            <p className="text-sm mt-1">Try adjusting your filters or date range</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-header border-b border-border-divider shadow-sm backdrop-blur-sm bg-opacity-90">
              <tr>
                <th className="py-4 px-4 font-semibold text-xs text-textSecondary uppercase tracking-wider">Transaction ID</th>
                <th className="py-4 px-4 font-semibold text-xs text-textSecondary uppercase tracking-wider">Teller</th>
                <th className="py-4 px-4 font-semibold text-xs text-textSecondary uppercase tracking-wider">Draw Time</th>
                <th className="py-4 px-4 font-semibold text-xs text-textSecondary uppercase tracking-wider">Reason</th>
                <th className="py-4 px-4 font-semibold text-xs text-textSecondary uppercase tracking-wider">Amount</th>
                <th className="py-4 px-4 font-semibold text-xs text-textSecondary uppercase tracking-wider">Date/Time</th>
                <th className="py-4 px-4 font-semibold text-xs text-textSecondary uppercase tracking-wider text-center">Status</th>
                <th className="py-4 px-4 font-semibold text-xs text-textSecondary uppercase tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-divider/50">
              {filteredRequests.map((req) => {
                const isApproved = req.is_approve === 1;

                return (
                  <tr
                    key={req.id}
                    className="transition-colors group hover:bg-surface-hover/40"
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono text-sm font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 inline-block">
                        {req.transactionId}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-textPrimary">{req.fullName || req.username}</div>
                      <div className="text-xs text-textSecondary">ID: {req.tellerId}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-textSecondary font-medium">
                      {formatDrawTime(req.drawTime)}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-textSecondary max-w-xs truncate" title={req.reason}>
                        {req.reason || '-'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-emerald-400">
                        {amounts[req.transactionId] !== undefined && amounts[req.transactionId] !== null ?
                          `₱${Number(amounts[req.transactionId]).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : (amounts[req.transactionId] === null ? '-' : <span className="text-xs text-textSecondary opacity-60">...</span>)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-textSecondary">{req.created_at?.split(' ')[0]}</div>
                      <div className="text-xs text-textSecondary">{req.created_at?.split(' ')[1]}</div>
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
                        className={`px-4 py-1.5 ${req.is_approve === 0 ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20' : 'bg-surface-hover hover:bg-surface-hover text-textSecondary border-border-divider'} border text-sm font-medium rounded-lg transition-colors`}
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
            className="bg-surface-hover border border-border-divider rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-border-divider bg-surface-header/50 shrink-0">
              <h3 className="text-xl font-bold text-textPrimary text-center w-full">
                Review Void Request
              </h3>
              <button
                onClick={() => !isApproving && setSelectedReviewRequest(null)}
                disabled={isApproving}
                className="text-textSecondary hover:text-textPrimary transition-colors absolute right-5"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-1 text-sm text-textSecondary mb-6">
                <p><span className="text-textSecondary">Teller:</span> <span className="font-medium text-textPrimary">{selectedReviewRequest.fullName || '-'}</span></p>
                <p><span className="text-textSecondary">Username:</span> <span className="font-medium text-textPrimary">{selectedReviewRequest.username || '-'}</span></p>
                <p><span className="text-textSecondary">Transaction ID:</span> <span className="font-mono text-indigo-400 font-medium">{selectedReviewRequest.transactionId}</span></p>
                <p><span className="text-textSecondary">Draw:</span> <span className="font-medium text-textPrimary">{formatDrawTime(selectedReviewRequest.drawTime)}</span></p>
                <p><span className="text-textSecondary">Bet Time:</span> <span className="font-medium text-textPrimary">{reviewDetails.length > 0 ? reviewDetails[0].created_at : '-'}</span></p>
                <p><span className="text-textSecondary">Void Requested at:</span> <span className="font-medium text-textPrimary">{selectedReviewRequest.created_at}</span></p>
                <p className="mt-2"><span className="text-textSecondary">Reason:</span> <span className="font-medium text-rose-300">{selectedReviewRequest.reason}</span></p>
              </div>

              {loadingReviewDetails ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : modalError ? (
                <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center mb-6">
                  <p className="text-sm text-rose-400 mb-3">{modalError}</p>
                  <button
                    type="button"
                    onClick={() => handleReviewClick(selectedReviewRequest)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry Fetch Details
                  </button>
                </div>
              ) : reviewDetails.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-border-divider rounded-xl my-4 bg-surface/50">
                  <AlertCircle className="w-8 h-8 text-amber-400/60 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-textPrimary">No bet records found for this transaction</p>
                  <p className="text-xs text-textSecondary mt-1">Bet details for this past transaction may have been cleared or archived by the server.</p>
                </div>
              ) : (
                <>
                  <table className="w-full text-left text-sm border-collapse mb-6">
                    <thead>
                      <tr className="border-b border-border-divider">
                        <th className="pb-3 text-textSecondary font-semibold uppercase tracking-wider text-xs">Game</th>
                        <th className="pb-3 text-textSecondary font-semibold uppercase tracking-wider text-xs">Number</th>
                        <th className="pb-3 text-textSecondary font-semibold uppercase tracking-wider text-xs">Amount</th>
                        <th className="pb-3 text-textSecondary font-semibold uppercase tracking-wider text-xs">Soldout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-divider/50">
                      {reviewDetails.map((item, i) => (
                        <tr key={i} className="hover:bg-surface-hover transition-colors">
                          <td className="py-3 text-textSecondary font-medium">{item.betCode}</td>
                          <td className="py-3 text-textPrimary font-bold">{item.betNo}</td>
                          <td className="py-3 text-textSecondary">{Number(item.betAmount).toString()}</td>
                          <td className="py-3 text-textSecondary">No</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="border-t border-border-divider pt-4 mb-8">
                    <p className="text-lg font-bold text-textPrimary">
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
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-textPrimary font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isApproving ? <RefreshCw className="w-5 h-5 animate-spin" /> : null}
                    Approve
                  </button>
                  <button
                    onClick={handleModalReject}
                    disabled={isApproving}
                    className="w-full py-3 bg-rose-500 hover:bg-rose-400 text-textPrimary font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
