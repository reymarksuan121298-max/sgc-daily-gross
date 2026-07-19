import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Users, LayoutGrid } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-cardBg p-3 border border-border-divider rounded shadow-lg">
        <p className="text-textPrimary font-semibold mb-1">{label}</p>
        <p className="text-accentGreen">
          Gross: P{payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export default function OverviewTab({ apiData, currentPage }) {
  let chartData = apiData?.chartData;
  let cardsData = apiData?.cardsData;

  // Dynamically map raw API data if it's the raw array
  if (!cardsData && Array.isArray(apiData?.data)) {
    const groups = {};
    const dates = {};

    // Build supervisor map
    const spvrMap = {};
    if (Array.isArray(apiData.supervisors)) {
      apiData.supervisors.forEach(s => spvrMap[s.id] = s.username?.toUpperCase() || s.fullName);
    }

    apiData.data.forEach(item => {
      // Group for cards
      const groupName = spvrMap[item.supervisor] || item.location || 'UNKNOWN AREA';
      if (!groups[groupName]) {
        groups[groupName] = { title: groupName, totalAmount: 0, tellersMap: {} };
      }
      
      const tellerName = item.fullName || item.username || 'UNKNOWN TELLER';
      groups[groupName].tellersMap[tellerName] = (groups[groupName].tellersMap[tellerName] || 0) + (item.TotalOverAllGross || 0);
      groups[groupName].totalAmount += (item.TotalOverAllGross || 0);

      // Group for chart
      if (item.drawMonth && item.drawDay && item.drawYear) {
        const dateStr = `${String(item.drawMonth).padStart(2, '0')}-${String(item.drawDay).padStart(2, '0')}-${String(item.drawYear).slice(-2)}`;
        if (!dates[dateStr]) dates[dateStr] = 0;
        dates[dateStr] += (item.TotalOverAllGross || 0);
      }
    });

    cardsData = Object.values(groups).map(g => {
      const tellersArr = Object.entries(g.tellersMap)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);
        
      return {
        title: g.title,
        total: `₱${g.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}`,
        tellers: tellersArr.slice(0, 3).map(t => ({ name: t.name, amount: t.amount.toLocaleString(undefined, {minimumFractionDigits: 2}) })),
        moreCount: Math.max(0, tellersArr.length - 3)
      };
    });

    if (!chartData) {
      chartData = Object.keys(dates).sort().map(d => ({ name: d, value: dates[d] }));
    }
  }

  chartData = chartData || [];
  cardsData = cardsData || [];

  let totalGross = 0;
  let totalTellersCount = 0;
  let totalUnitsCount = 0;

  if (Array.isArray(apiData?.data)) {
    totalGross = apiData.data.reduce((acc, curr) => acc + (curr.TotalOverAllGross || 0), 0);
    const uniqueTellers = new Set();
    const uniqueUnits = new Set();
    apiData.data.forEach(item => {
      if (item.username || item.fullName) uniqueTellers.add(item.username || item.fullName);
      if (item.supervisor) uniqueUnits.add(item.supervisor);
    });
    totalTellersCount = uniqueTellers.size;
    totalUnitsCount = uniqueUnits.size;
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-cardBg border border-border-divider rounded-2xl p-6 shadow-lg flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-emerald-400">
            <DollarSign className="w-20 h-20" />
          </div>
          <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <DollarSign className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-textSecondary uppercase tracking-wider">Total Gross Sales</p>
            <p className="text-3xl font-bold text-textPrimary">₱{totalGross.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          </div>
        </div>

        <div className="bg-cardBg border border-border-divider rounded-2xl p-6 shadow-lg flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-blue-400">
            <Users className="w-20 h-20" />
          </div>
          <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <Users className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-textSecondary uppercase tracking-wider">Active Tellers</p>
            <p className="text-3xl font-bold text-textPrimary">{totalTellersCount}</p>
          </div>
        </div>

        <div className="bg-cardBg border border-border-divider rounded-2xl p-6 shadow-lg flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-purple-400">
            <LayoutGrid className="w-20 h-20" />
          </div>
          <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <LayoutGrid className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-textSecondary uppercase tracking-wider">Active Units</p>
            <p className="text-3xl font-bold text-textPrimary">{totalUnitsCount}</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-cardBg rounded-2xl p-6 border border-border-divider shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accentGreen/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex justify-between items-center mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
            <h2 className="text-xl font-bold tracking-wide">DAILY PERFORMANCE TREND</h2>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-textSecondary">
            <span className="w-3 h-3 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            {currentPage === 'imp' ? 'Imperial' : currentPage === 'setb' ? 'SETB' : currentPage === 'iligan' ? 'Iligan' : currentPage === 'lanao' ? 'Lanao' : currentPage === 'lotto' ? 'Lotto' : currentPage === 'baloi' ? 'Baloi' : currentPage === 'lds' ? 'LDS' : 'Mag'} Aggregate Trend
          </div>
        </div>

        <div className="h-[350px] w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke="#94a3b8" 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toLocaleString()}
                dx={-10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="var(--color-accentGreen)" 
                strokeWidth={3}
                dot={{ r: 4, fill: "var(--color-accentGreen)", strokeWidth: 2, stroke: "#1e293b" }}
                activeDot={{ r: 6, fill: "#fff", stroke: "var(--color-accentGreen)", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cardsData.map((card, idx) => (
          <div key={idx} className="bg-surface rounded-xl p-6 border border-border-divider shadow-xl flex flex-col h-full hover:border-border-divider transition-colors">
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-[11px] font-extrabold text-textPrimary uppercase tracking-wider w-3/5 leading-tight">{card.title}</h3>
              <span className="text-[#00b87c] font-extrabold text-[13px]">{card.total.replace('₱', 'P')}</span>
            </div>
            
            <div className="flex-1 space-y-4">
              {card.tellers.map((teller, tIdx) => (
                <div key={tIdx} className="flex justify-between items-center text-[10px]">
                  <span className="text-textSecondary font-bold uppercase tracking-wide truncate pr-2" title={teller.name}>{teller.name}</span>
                  <span className="text-textPrimary font-extrabold">{teller.amount}</span>
                </div>
              ))}
            </div>

            {card.moreCount > 0 && (
              <div className="mt-6 text-center">
                <button className="text-[10px] text-textSecondary hover:text-textPrimary font-extrabold tracking-widest uppercase transition-colors">
                  + {card.moreCount} MORE TELLERS
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
