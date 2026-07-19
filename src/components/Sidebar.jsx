import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Ticket, TicketSlash, UserCheck, ChevronDown, ChevronRight, BarChart3, LogOut, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentPage, setCurrentPage, isOpen, setIsOpen }) {
  const { user, logout } = useAuth();

  const [isDashboardsOpen, setIsDashboardsOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar_dashboards_open');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [isUnclaimedOpen, setIsUnclaimedOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar_unclaimed_open');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [isVoidRequestsOpen, setIsVoidRequestsOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar_void_requests_open');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('sidebar_dashboards_open', JSON.stringify(isDashboardsOpen));
  }, [isDashboardsOpen]);

  useEffect(() => {
    localStorage.setItem('sidebar_unclaimed_open', JSON.stringify(isUnclaimedOpen));
  }, [isUnclaimedOpen]);

  useEffect(() => {
    localStorage.setItem('sidebar_void_requests_open', JSON.stringify(isVoidRequestsOpen));
  }, [isVoidRequestsOpen]);

  const [isActiveTellersOpen, setIsActiveTellersOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar_active_tellers_open');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('sidebar_active_tellers_open', JSON.stringify(isActiveTellersOpen));
  }, [isActiveTellersOpen]);

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
    } else if (user.username === 'iligan_lotto') {
      dashboardItems = dashboardItems.filter(item => ['iligan', 'lotto'].includes(item.id));
    } else if (user.username === 'striketeam') {
      dashboardItems = dashboardItems.filter(item => item.id === 'mag');
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

  let voidRequestItems = [
    { id: 'void_req_mag', label: 'Mag Void Requests' },
    { id: 'void_req_imp', label: 'Imp Void Requests' },
  ];

  if (user && user.username !== 'admin') {
    const voidMap = {
      'maguindanao': 'void_req_mag',
      'imperial': 'void_req_imp'
    };
    const allowedVoid = voidMap[user.username];
    if (allowedVoid) {
      voidRequestItems = voidRequestItems.filter(i => i.id === allowedVoid);
    } else {
      voidRequestItems = [];
    }
  }

  let activeTellersItems = [
    { id: 'active_tellers_mag', label: 'Mag Teller Transactions' },
    { id: 'active_tellers_imp', label: 'Imp Teller Transactions' },
    { id: 'active_tellers_iligan', label: 'Iligan Teller Transactions' },
    { id: 'active_tellers_lanao', label: 'Lanao Teller Transactions' },
    { id: 'active_tellers_setb', label: 'SETB Teller Transactions' },
    { id: 'active_tellers_lotto', label: 'Lotto Teller Transactions' },
    { id: 'active_tellers_baloi', label: 'Baloi Teller Transactions' },
  ];

  if (user && user.username !== 'admin') {
    const activeMap = {
      'maguindanao': 'active_tellers_mag',
      'imperial': 'active_tellers_imp'
    };
    const allowed = activeMap[user.username];
    if (allowed) {
      activeTellersItems = activeTellersItems.filter(i => i.id === allowed);
    } else {
      activeTellersItems = [];
    }
  }

  const isAnyDashboardActive = dashboardItems.some(item => item.id === currentPage);
  const isAnyUnclaimedActive = unclaimedItems.some(item => item.id === currentPage);
  const isAnyActiveTellersActive = activeTellersItems.some(item => item.id === currentPage);
  const isAnyVoidRequestsActive = voidRequestItems.some(item => item.id === currentPage);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border-divider p-4 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="mb-8 px-2 flex items-center justify-between">
          <h2 className="text-xl font-bold text-textPrimary tracking-wide">STL<span className="text-blue-500">CONTROL</span></h2>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 text-textSecondary hover:text-textPrimary rounded-md hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
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
                    : "text-textSecondary hover:bg-surface-hover hover:text-textPrimary"
                )}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Dashboards</span>
                </div>
                {isDashboardsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {isDashboardsOpen && (
                <div className="mt-1 ml-4 pl-4 border-l border-border-divider space-y-1">
                  {dashboardItems.map((item) => {
                    const isActive = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setCurrentPage(item.id)}
                        className={clsx(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-blue-600 text-textPrimary shadow-lg shadow-blue-900/20"
                            : "text-textSecondary hover:bg-surface-hover hover:text-textPrimary"
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
                    : "text-textSecondary hover:bg-surface-hover hover:text-textPrimary"
                )}
              >
                <div className="flex items-center gap-3">
                  <Ticket className="w-5 h-5" />
                  <span>Unclaimed Tickets</span>
                </div>
                {isUnclaimedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {isUnclaimedOpen && (
                <div className="mt-1 ml-4 pl-4 border-l border-border-divider space-y-1">
                  {unclaimedItems.map((item) => {
                    const isActive = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setCurrentPage(item.id)}
                        className={clsx(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-rose-600 text-textPrimary shadow-lg shadow-rose-900/20"
                            : "text-textSecondary hover:bg-surface-hover hover:text-textPrimary"
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

          {/* Void Requests Section */}
          {user?.username === 'admin' && (
            <div>
              <button
                onClick={() => setIsVoidRequestsOpen(!isVoidRequestsOpen)}
                className={clsx(
                  "w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-colors mt-2",
                  isAnyVoidRequestsActive && !isVoidRequestsOpen
                    ? "bg-amber-900/30 text-amber-400"
                    : "text-textSecondary hover:bg-surface-hover hover:text-textPrimary"
                )}
              >
                <div className="flex items-center gap-3">
                  <TicketSlash className="w-5 h-5" />
                  <span>Void Requests</span>
                </div>
                {isVoidRequestsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {isVoidRequestsOpen && (
                <div className="mt-1 ml-4 pl-4 border-l border-border-divider space-y-1">
                  {voidRequestItems.map((item) => {
                    const isActive = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setCurrentPage(item.id)}
                        className={clsx(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-amber-600 text-textPrimary shadow-lg shadow-amber-900/20"
                            : "text-textSecondary hover:bg-surface-hover hover:text-textPrimary"
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

          {/* Active Tellers Section */}
          {user?.username === 'admin' && (
            <div>
              <button
                onClick={() => setIsActiveTellersOpen(!isActiveTellersOpen)}
                className={clsx(
                  "w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-colors mt-2",
                  isAnyActiveTellersActive && !isActiveTellersOpen
                    ? "bg-emerald-900/30 text-emerald-400"
                    : "text-textSecondary hover:bg-surface-hover hover:text-textPrimary"
                )}
              >
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5" />
                  <span>Teller Transactions</span>
                </div>
                {isActiveTellersOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {isActiveTellersOpen && (
                <div className="mt-1 ml-4 pl-4 border-l border-border-divider space-y-1">
                  {activeTellersItems.map((item) => {
                    const isActive = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setCurrentPage(item.id)}
                        className={clsx(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-emerald-600 text-textPrimary shadow-lg shadow-emerald-900/20"
                            : "text-textSecondary hover:bg-surface-hover hover:text-textPrimary"
                        )}
                      >
                        <UserCheck className="w-4 h-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="mt-auto px-2 pt-4 border-t border-border-divider">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-textSecondary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-textPrimary capitalize">{user?.username || 'Admin User'}</p>
                <p className="text-xs text-textSecondary">STL System</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 text-textSecondary hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Log Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
