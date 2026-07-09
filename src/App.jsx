import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Filter, Users, LayoutDashboard, List, BarChart2, CalendarDays, CalendarRange, Crown, Menu } from 'lucide-react';
import { clsx } from 'clsx';
import axios from 'axios';

// Import Tab Components
import OverviewTab from './components/OverviewTab';
import DetailsTab from './components/DetailsTab';
import ComparisonTab from './components/ComparisonTab';
import FifteenDaysTab from './components/FifteenDaysTab';
import MonthlyTab from './components/MonthlyTab';
import SpvrWeeklyTab from './components/SpvrWeeklyTab';
import FilterDropdown from './components/FilterDropdown';
import Sidebar from './components/Sidebar';
import UnclaimedTickets from './components/UnclaimedTickets';
import ActiveTellers from './components/ActiveTellers';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';

const TABS = [
  { id: 'overview', label: 'OVERVIEW', icon: LayoutDashboard },
  { id: 'details', label: 'DETAILS', icon: List },
  { id: 'spvrweekly', label: 'SPVR WEEKLY', icon: CalendarDays },
  { id: 'comparison', label: 'COMPARISON', icon: BarChart2 },
  { id: '15days', label: '15 DAYS', icon: CalendarDays },
  { id: 'monthly', label: 'MONTHLY', icon: CalendarRange }
];

function App() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('app_active_tab') || 'overview';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    localStorage.setItem('app_active_tab', activeTab);
  }, [activeTab]);
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem('app_current_page') || 'mag';
  });

  React.useEffect(() => {
    localStorage.setItem('app_current_page', currentPage);
  }, [currentPage]);

  React.useEffect(() => {
    if (user && user.username !== 'admin') {
      if (user.username === 'unclaimed') {
        const validUnclaimed = ['unclaimed', 'unclaimed_ldn', 'unclaimed_lds', 'unclaimed_imp'];
        if (!validUnclaimed.includes(currentPage)) {
          setCurrentPage('unclaimed');
        }
      } else {
        const usernameMap = {
          'maguindanao': 'mag',
          'imperial': 'imp'
        };
        const allowedPage = usernameMap[user.username] || user.username;
        const validPages = [allowedPage];
        
        // Maguindanao and Imperial users are also allowed to see their Active Tellers
        if (allowedPage === 'mag') {
          validPages.push('active_tellers_mag');
        } else if (allowedPage === 'imp') {
          validPages.push('active_tellers_imp');
        }
        
        if (!validPages.includes(currentPage)) {
          setCurrentPage(allowedPage);
        }
      }
    }
  }, [user, currentPage]);
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [selectedTellers, setSelectedTellers] = useState([]);

  // Default to today
  const [selectedEndDate, setSelectedEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const fetchRealData = async (endDateStr, page) => {
    if (page === 'active_tellers_mag' || page === 'active_tellers_imp') {
      setApiData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let authHeader;
      let baseUrl;
      let idParam;

      if (page === 'lds') {
        authHeader = { headers: { 'Authorization': 'Bearer 111012|Ag4bzY0DBPYHbQsl8QxhqpdURrT6LYmsWnQsLEif' } };
        baseUrl = 'https://stl-lds-api.com/api/accountant';
        idParam = '1';
      } else if (page === 'baloi') {
        authHeader = { headers: { 'Authorization': 'Bearer 52382|TbvbjynEw9xiusXbvQ1ZG7iTZyQPdK0vCaZvhdN2' } };
        baseUrl = 'https://stl-ldn-api.com/api/accountant';
        idParam = '6';
      } else if (page === 'lotto') {
        authHeader = { headers: { 'Authorization': 'Bearer 52381|Uuxa0i0M6AeysXHd5z11G2K4AsCiaDD0h7B3YdD8' } };
        baseUrl = 'https://stl-ldn-api.com/api/accountant';
        idParam = '8';
      } else if (page === 'lanao') {
        authHeader = { headers: { 'Authorization': 'Bearer 52379|ET5cJogQqR4LuBPMZoFBDQWbNMLGZKjogWQXX0AV' } };
        baseUrl = 'https://stl-ldn-api.com/api/accountant';
        idParam = '2';
      } else if (page === 'iligan') {
        authHeader = { headers: { 'Authorization': 'Bearer 52377|5JOEAHdiBRMXs77YYV0DYsShdGQ4l1XH5LOpGOWj' } };
        baseUrl = 'https://stl-ldn-api.com/api/accountant';
        idParam = '5';
      } else if (page === 'setb') {
        authHeader = { headers: { 'Authorization': 'Bearer 52234|Onnl7X9xpobG8aCWc9ljH7myoRBSmjBkuShdmoSS' } };
        baseUrl = 'https://stl-ldn-api.com/api/accountant';
        idParam = '7';
      } else if (page === 'imp') {
        authHeader = { headers: { 'Authorization': 'Bearer 56330|qagnV8cXj50qLK2xxMCorZ5QTTjrHls9Get3xxxA' } };
        baseUrl = 'https://stl-cotabato-api.com/api/accountant';
        idParam = '2';
      } else if (page === 'unclaimed_ldn') {
        authHeader = { headers: { 'Authorization': 'Bearer 52382|TbvbjynEw9xiusXbvQ1ZG7iTZyQPdK0vCaZvhdN2' } };
        baseUrl = 'https://stl-ldn-api.com/api/accountant';
        idParam = '6';
      } else if (page === 'unclaimed_lds') {
        authHeader = { headers: { 'Authorization': 'Bearer 111012|Ag4bzY0DBPYHbQsl8QxhqpdURrT6LYmsWnQsLEif' } };
        baseUrl = 'https://stl-lds-api.com/api/accountant';
        idParam = '1';
      } else if (page === 'unclaimed_imp') {
        authHeader = { headers: { 'Authorization': 'Bearer 56406|I3jbYEequ4SjZPy4c3JI8QxQ7riFti5CdfKI1xN1' } };
        baseUrl = 'https://stl-cotabato-api.com/api/accountant';
        idParam = '2';
      } else {
        authHeader = { headers: { 'Authorization': 'Bearer 142375|bgm3cNBv4knCMImS9OLYFiMr7mIV7aDirkb0msqH' } };
        baseUrl = 'https://stl-mag-api.com/api/accountant';
        idParam = '2';
      }

      const formatDate = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      let grossData = [];
      let spvrData = [];
      
      const endDate = new Date(endDateStr);

      if (activeTab === '15days' || activeTab === 'monthly') {
        // Fetch current month
        const currFrom = new Date(endDate);
        currFrom.setDate(1);
        const currFromStr = formatDate(currFrom);
        const currToStr = formatDate(endDate);
        
        // Fetch previous month
        const prevEnd = new Date(currFrom);
        prevEnd.setDate(0); // last day of previous month
        const prevFrom = new Date(prevEnd);
        prevFrom.setDate(1); // 1st day of previous month
        
        const prevFromStr = formatDate(prevFrom);
        const prevEndStr = formatDate(prevEnd);
        
        const [currGross, currSpvr, prevGross, prevSpvr] = await Promise.all([
          axios.get(`${baseUrl}/TellerGrossPerDateRange?id=${idParam}&from=${currFromStr}&to=${currToStr}`, authHeader),
          axios.get(`${baseUrl}/AccountantSpvrWithGross?id=${idParam}&from=${currFromStr}&to=${currToStr}`, authHeader),
          axios.get(`${baseUrl}/TellerGrossPerDateRange?id=${idParam}&from=${prevFromStr}&to=${prevEndStr}`, authHeader),
          axios.get(`${baseUrl}/AccountantSpvrWithGross?id=${idParam}&from=${prevFromStr}&to=${prevEndStr}`, authHeader)
        ]);
        
        grossData = [...prevGross.data.data, ...currGross.data.data];
        
        const spvrMap = new Map();
        [...prevSpvr.data.data, ...currSpvr.data.data].forEach(s => spvrMap.set(s.id, s));
        spvrData = Array.from(spvrMap.values());
      } else {
        const pastDate = new Date(endDate);
        pastDate.setDate(endDate.getDate() - 13); // 14-day window (7 prev vs 7 curr)
        
        const toStr = formatDate(endDate);
        const fromStr = formatDate(pastDate);

        const [grossRes, spvrRes] = await Promise.all([
          axios.get(`${baseUrl}/TellerGrossPerDateRange?id=${idParam}&from=${fromStr}&to=${toStr}`, authHeader),
          axios.get(`${baseUrl}/AccountantSpvrWithGross?id=${idParam}&from=${fromStr}&to=${toStr}`, authHeader)
        ]);
        grossData = grossRes.data.data;
        spvrData = spvrRes.data.data;
      }

      setApiData({
        data: grossData,
        supervisors: spvrData
      });
    } catch (err) {
      console.error("Failed to fetch real data", err);
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealData(selectedEndDate, currentPage);
  }, [selectedEndDate, activeTab, currentPage]);

  // Extract unique units and tellers from apiData for the dropdown options
  const units = useMemo(() => {
    if (!apiData?.supervisors) return [];
    return [...apiData.supervisors].sort((a, b) => {
      const nameA = a.username?.toUpperCase() || a.fullName || '';
      const nameB = b.username?.toUpperCase() || b.fullName || '';
      return nameA.localeCompare(nameB);
    });
  }, [apiData]);

  const tellers = useMemo(() => {
    if (!apiData?.data) return [];
    const tMap = new Set();
    const result = [];
    apiData.data.forEach(item => {
      const tName = item.fullName || item.username;
      const tId = item.username || item.fullName;
      if (tName && !tMap.has(tId)) {
        tMap.add(tId);
        result.push({ id: tId, name: tName, supervisor: item.supervisor });
      }
    });
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [apiData]);

  // Generate filtered data to pass down to tabs
  const filteredApiData = useMemo(() => {
    if (!apiData) return null;
    let filtered = [...apiData.data];

    if (selectedUnits.length > 0) {
      filtered = filtered.filter(item => selectedUnits.includes(String(item.supervisor)));
    }

    if (selectedTellers.length > 0) {
      filtered = filtered.filter(item => (selectedTellers.includes(item.username) || selectedTellers.includes(item.fullName)));
    }

    return { ...apiData, data: filtered };
  }, [apiData, selectedUnits, selectedTellers]);

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex min-h-screen bg-appBg text-textPrimary font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={(page) => {
          setCurrentPage(page);
          setIsMobileMenuOpen(false);
        }} 
        isOpen={isMobileMenuOpen}
        setIsOpen={setIsMobileMenuOpen}
      />

      <div className="flex-1 p-4 md:p-6 h-screen overflow-y-auto relative">
        {/* Global Header Section */}
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">

          {/* Logo and Title */}
          <div className="flex items-center gap-2 group cursor-pointer">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-[#253247] text-slate-300 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="bg-white rounded-full p-2 h-10 w-10 md:h-14 md:w-14 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-shadow">
              <Crown className="text-yellow-600 h-5 w-5 md:h-8 md:w-8" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-textPrimary">
                {currentPage === 'imp' ? 'Imperial' : 
                 currentPage === 'setb' ? 'SETB' : 
                 currentPage === 'iligan' ? 'Iligan' : 
                 currentPage === 'lanao' ? 'Lanao' : 
                 currentPage === 'lotto' ? 'Lotto' : 
                 currentPage === 'baloi' ? 'Baloi' : 
                 currentPage === 'lds' ? 'LDS' : 
                 currentPage === 'active_tellers_mag' ? 'Mag Active Tellers' : 
                 currentPage === 'active_tellers_imp' ? 'Imperial Active Tellers' : 
                 'Mag'} Dashboard
              </h1>
              <div className="flex items-center gap-2 text-sm text-textSecondary mt-1">
                <span>Daily Gross Tracking Control</span>
                <span className="text-blue-500 font-bold text-[10px] tracking-widest uppercase bg-blue-500/10 px-2 py-0.5 rounded">Regional Unit</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <div className="relative flex items-center bg-cardBg hover:bg-[#253247] border border-slate-700/50 rounded-md transition-all focus-within:ring-2 focus-within:ring-indigo-500/50 cursor-pointer">
              <Calendar className="w-4 h-4 ml-4 text-textSecondary" />
              <input
                type="date"
                value={selectedEndDate}
                onChange={(e) => setSelectedEndDate(e.target.value)}
                className="bg-transparent text-textSecondary hover:text-white px-3 py-2.5 text-sm outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert opacity-80 hover:opacity-100 transition-opacity"
                title="Select End Date (Calculates 14 days prior)"
              />
            </div>

            <FilterDropdown
              icon={Filter}
              label="All Units"
              options={units.map(u => ({ id: String(u.id), name: u.username?.toUpperCase() || u.fullName }))}
              selectedValues={selectedUnits}
              onSelect={(ids) => {
                setSelectedUnits(ids);
                setSelectedTellers([]); // reset tellers when unit selection changes
              }}
              placeholder="Search unit list..."
              align="right"
            />

            <FilterDropdown
              icon={Users}
              label="All Tellers"
              options={tellers.filter(t => selectedUnits.length === 0 || selectedUnits.includes(String(t.supervisor)))}
              selectedValues={selectedTellers}
              onSelect={setSelectedTellers}
              placeholder="Search teller list..."
              align="right"
            />
          </div>

          {/* Tabs */}
          {(currentPage === 'mag' || currentPage === 'imp' || currentPage === 'setb' || currentPage === 'iligan' || currentPage === 'lanao' || currentPage === 'lotto' || currentPage === 'baloi' || currentPage === 'lds') && (
            <div className="flex bg-cardBg p-1 rounded-md border border-slate-700/50 overflow-x-auto w-full xl:w-auto shadow-inner">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all whitespace-nowrap outline-none",
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                      : "text-textSecondary hover:text-white hover:bg-[#253247]"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Main Content Area */}
        <main>
          {(currentPage === 'mag' || currentPage === 'imp' || currentPage === 'setb' || currentPage === 'iligan' || currentPage === 'lanao' || currentPage === 'lotto' || currentPage === 'baloi' || currentPage === 'lds') ? (
            loading ? (
              <div className="flex justify-center items-center h-64 text-textSecondary">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accentGreen mr-3"></div>
                Loading Data...
              </div>
            ) : error ? (
              <div className="flex justify-center items-center h-64 text-red-500 bg-red-500/10 rounded-xl border border-red-500/30">
                <p>Error: {error}</p>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && <OverviewTab apiData={filteredApiData} currentPage={currentPage} />}
                {activeTab === 'details' && <DetailsTab apiData={filteredApiData} currentPage={currentPage} />}
                {activeTab === 'spvrweekly' && <SpvrWeeklyTab apiData={filteredApiData} currentPage={currentPage} />}
                {activeTab === 'comparison' && <ComparisonTab apiData={filteredApiData} currentPage={currentPage} selectedEndDate={selectedEndDate} />}
                {activeTab === '15days' && <FifteenDaysTab apiData={filteredApiData} selectedEndDate={selectedEndDate} />}
                {activeTab === 'monthly' && <MonthlyTab apiData={filteredApiData} selectedEndDate={selectedEndDate} />}
              </>
            )
          ) : (currentPage === 'active_tellers_mag' || currentPage === 'active_tellers_imp') ? (
            <ActiveTellers currentPage={currentPage} />
          ) : (
            <UnclaimedTickets
              selectedEndDate={selectedEndDate}
              selectedUnits={selectedUnits}
              selectedTellers={selectedTellers}
              spvrMap={apiData?.supervisors || []}
              currentPage={currentPage}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
