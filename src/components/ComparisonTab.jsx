import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import SharedTable from './SharedTable';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-cardBg p-3 border border-slate-700 rounded shadow-lg">
        <p className="text-textPrimary font-semibold mb-2">{label}</p>
        <p className="text-slate-400 text-sm">
          Previous 7 Days: ₱{payload[0].value.toLocaleString()}
        </p>
        <p className="text-indigo-400 text-sm">
          Current 7 Days: ₱{payload[1].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export default function ComparisonTab({ apiData, selectedEndDate, currentPage }) {
  const regionName = currentPage === 'imp' ? 'IMPERIAL' : currentPage === 'setb' ? 'SETB' : currentPage === 'iligan' ? 'ILIGAN' : currentPage === 'lanao' ? 'LANAO' : currentPage === 'lotto' ? 'LOTTO' : currentPage === 'baloi' ? 'BALOI' : currentPage === 'lds' ? 'LDS' : 'MAG';
  let barData = apiData?.comparisonData?.barData;
  let tableData = apiData?.comparisonData?.tableData;
  let summary = apiData?.comparisonData?.summary;

  if (!barData && Array.isArray(apiData?.data)) {
    const rawData = apiData.data;

    const spvrMap = {};
    if (Array.isArray(apiData.supervisors)) {
      apiData.supervisors.forEach(s => spvrMap[s.id] = s.username?.toUpperCase() || s.fullName);
    }

    const dateSet = new Set();
    rawData.forEach(item => {
      if (item.drawMonth && item.drawDay && item.drawYear) {
        const sortable = `${item.drawYear}-${String(item.drawMonth).padStart(2, '0')}-${String(item.drawDay).padStart(2, '0')}`;
        dateSet.add(sortable);
      }
    });

    const sortedDates = Array.from(dateSet).sort();

    // Determine the reference date
    let maxDateStr = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
    const parseDateStr = (dateStr) => {
      if (!dateStr) return new Date();
      const [y, m, d] = dateStr.split('-');
      return new Date(y, m - 1, d);
    };
    
    let refDateStr = selectedEndDate || maxDateStr;
    let refDate = parseDateStr(refDateStr);

    if (isNaN(refDate.getTime())) {
      refDate = new Date();
    }

    // Find the Sunday of the current week
    let dayOfWeek = refDate.getDay(); // 0 (Sun) to 6 (Sat)
    let currentSunday = new Date(refDate);
    currentSunday.setDate(refDate.getDate() - dayOfWeek);

    const current7Dates = [];
    for (let i = 0; i < 7; i++) {
      let d = new Date(currentSunday);
      d.setDate(currentSunday.getDate() + i);
      current7Dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }

    let prevSunday = new Date(currentSunday);
    prevSunday.setDate(currentSunday.getDate() - 7);
    const previous7Dates = [];
    for (let i = 0; i < 7; i++) {
      let d = new Date(prevSunday);
      d.setDate(prevSunday.getDate() + i);
      previous7Dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }

    const formatDateRange = (datesArr) => {
      if (!datesArr || datesArr.length === 0) return 'NO DATA';
      const formatSingle = (d) => {
        const [y, m, day] = d.split('-');
        return `${m}-${day}-${y.slice(2)}`;
      };
      return `${formatSingle(datesArr[0])} TO ${formatSingle(datesArr[datesArr.length - 1])}`;
    };

    let prevTotal = 0;
    let currTotal = 0;
    let daysArray = Array(7).fill().map(() => ({ prev: 0, curr: 0 }));
    const groups = {};

    rawData.forEach(item => {
      if (!item.drawMonth) return;
      const sortableDate = `${item.drawYear}-${String(item.drawMonth).padStart(2, '0')}-${String(item.drawDay).padStart(2, '0')}`;
      const amount = item.TotalOverAllGross || 0;
      const groupName = spvrMap[item.supervisor] || item.location || 'UNKNOWN AREA';

      if (!groups[groupName]) {
        groups[groupName] = { area: groupName, prev: 0, curr: 0 };
      }

      const currIdx = current7Dates.indexOf(sortableDate);
      if (currIdx !== -1) {
        daysArray[currIdx].curr += amount;
        currTotal += amount;
        groups[groupName].curr += amount;
      }

      const prevIdx = previous7Dates.indexOf(sortableDate);
      if (prevIdx !== -1) {
        daysArray[prevIdx].prev += amount;
        prevTotal += amount;
        groups[groupName].prev += amount;
      }
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    barData = daysArray.map((d, i) => ({
      name: dayNames[i],
      prev: d.prev,
      curr: d.curr
    }));

    const shiftPercent = prevTotal === 0 ? (currTotal > 0 ? 100 : 0) : ((currTotal - prevTotal) / prevTotal) * 100;

    summary = {
      prevDate: formatDateRange(previous7Dates),
      prevTotal,
      currDate: formatDateRange(current7Dates),
      currTotal,
      shiftPercent: parseFloat(shiftPercent.toFixed(1))
    };

    tableData = Object.values(groups).map(g => ({
      area: g.area,
      prev: g.prev,
      curr: g.curr,
      change: g.curr - g.prev,
      trend: g.prev === 0 ? (g.curr > 0 ? 100 : 0) : ((g.curr - g.prev) / g.prev) * 100
    })).sort((a, b) => b.curr - a.curr);
  }

  // Fallbacks
  barData = barData || [];
  tableData = tableData || [];
  summary = summary || { prevDate: '', prevTotal: 0, currDate: '', currTotal: 0, shiftPercent: 0 };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card */}
        <div className="bg-cardBg rounded-2xl p-8 border border-slate-700/50 shadow-lg flex flex-col justify-between">
          <h3 className="text-xl font-bold tracking-wide mb-8">7-Day Weekly Comparison</h3>
          
          <div className="flex justify-between items-center mb-10">
            <div>
              <p className="text-xs text-textSecondary mb-1">{summary.prevDate}</p>
              <p className="text-2xl font-bold">₱{summary.prevTotal?.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
            <div className="text-textSecondary font-semibold text-sm">VS</div>
            <div className="text-right">
              <p className="text-xs text-indigo-400 font-bold mb-1">{summary.currDate}</p>
              <p className="text-2xl font-bold">₱{summary.currTotal?.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
          </div>
          
          <div className="flex justify-center">
            <div className={`border px-8 py-4 rounded-xl text-center ${summary.shiftPercent >= 0 ? 'bg-[#0e2920] border-accentGreen/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
              <p className={`text-3xl font-bold mb-1 ${summary.shiftPercent >= 0 ? 'text-accentGreen' : 'text-rose-500'}`}>
                {summary.shiftPercent > 0 ? "+" : ""}{summary.shiftPercent}%
              </p>
              <p className={`text-[10px] font-bold tracking-widest uppercase ${summary.shiftPercent >= 0 ? 'text-accentGreen' : 'text-rose-500'}`}>
                NET PERFORMANCE SHIFT
              </p>
            </div>
          </div>
        </div>

        {/* Right Card - Chart */}
        <div className="bg-cardBg rounded-2xl p-6 border border-slate-700/50 shadow-lg lg:col-span-2">
          <h3 className="text-lg font-bold tracking-wide mb-6">Daily Flow (Last 7 Days)</h3>
          
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => value.toLocaleString()} dx={-10} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#334155', opacity: 0.2}} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} verticalAlign="top" align="right" />
                <Bar dataKey="prev" name="Previous 7 Days" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="curr" name="Current 7 Days" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <SharedTable 
        title="Supervisory Unit Shift" 
        col1Header={summary.prevDate} 
        col2Header={summary.currDate} 
        data={tableData} 
        exportFilename={`${regionName}_Weekly_Gross_Sales.xlsx`}
      />

    </div>
  );
}
