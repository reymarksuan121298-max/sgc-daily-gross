import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Ticket, TicketSlash, UserCheck, ChevronDown, ChevronRight, BarChart3, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentPage, setCurrentPage }) {
  const { user, logout } = useAuth();
  
  const [isDashboardsOpen, setIsDashboardsOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar_dashboards_open');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [isUnclaimedOpen, setIsUnclaimedOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar_unclaimed_open');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('sidebar_dashboards_open', JSON.stringify(isDashboardsOpen));
  }, [isDashboardsOpen]);

  useEffect(() => {
    localStorage.setItem('sidebar_unclaimed_open', JSON.stringify(isUnclaimedOpen));
  }, [isUnclaimedOpen]);

  let dashboardItems = [
    { id: 'mag', label: 'Mag Dashboard' },
    { id: 'imp', label: 'Imp Dashboard' },
    { id: 'setb', label: 'SETB Dashboard' },
    { id: 'iligan', label: 'Iligan Dashboard' },
    { id: 'lanao', label: 'Lanao Dashboard' },
    { id: 'lotto', label: 'Lotto Dashboard' },
    { id: 'baloi', label: 'Baloi Dashboard' },
    { id: 'lds', label: 'LDS Dashboard' },
  ];

  if (user && user.username !== 'admin') {
    if (user.username === 'unclaimed') {
      dashboardItems = [];
    } else {
      const usernameMap = {
        'maguindanao': 'mag',
        'imperial': 'imp'
      };
      const userDashId = usernameMap[user.username] || user.username;
      dashboardItems = dashboardItems.filter(item => item.id === userDashId);
    }
  }

  const unclaimedItems = [
    { id: 'unclaimed', label: 'Mag Unclaimed Tickets' },
    { id: 'unclaimed_ldn', label: 'LDN Unclaimed Tickets' },
    { id: 'unclaimed_lds', label: 'LDS Unclaimed Tickets' },
    { id: 'unclaimed_imp', label: 'Imp Unclaimed Tickets' },
  ];

  const isAnyDashboardActive = dashboardItems.some(item => item.id === currentPage);
  const isAnyUnclaimedActive = unclaimedItems.some(item => item.id === currentPage);

  return (
    <div className="w-64 bg-[#111827] border-r border-slate-800 min-h-screen p-4 flex flex-col hidden lg:flex">
      <div className="mb-8 px-2">
        <h2 className="text-xl font-bold text-white tracking-wide">STL<span className="text-blue-500">CONTROL</span></h2>
      </div>

      <nav className="flex-1 space-y-2">
        {dashboardItems.length > 0 && (
          <div>
            <button
            onClick={() => setIsDashboardsOpen(!isDashboardsOpen)}
            className={clsx(
              "w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-colors",
              isAnyDashboardActive && !isDashboardsOpen
                ? "bg-blue-900/30 text-blue-400"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboards</span>
            </div>
            {isDashboardsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {isDashboardsOpen && (
            <div className="mt-1 ml-4 pl-4 border-l border-slate-800 space-y-1">
              {dashboardItems.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={clsx(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <BarChart3 className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        )}

        {(user?.username === 'admin' || user?.username === 'unclaimed') && (
          <div>
            <button
              onClick={() => setIsUnclaimedOpen(!isUnclaimedOpen)}
              className={clsx(
                "w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                isAnyUnclaimedActive && !isUnclaimedOpen
                  ? "bg-rose-900/30 text-rose-400"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <Ticket className="w-5 h-5" />
                <span>Unclaimed Tickets</span>
              </div>
              {isUnclaimedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {isUnclaimedOpen && (
              <div className="mt-1 ml-4 pl-4 border-l border-slate-800 space-y-1">
                {unclaimedItems.map((item) => {
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentPage(item.id)}
                      className={clsx(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-rose-600 text-white shadow-lg shadow-rose-900/20"
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      )}
                    >
                      <TicketSlash className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="mt-auto px-2 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white capitalize">{user?.username || 'Admin User'}</p>
              <p className="text-xs text-slate-400">STL System</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
