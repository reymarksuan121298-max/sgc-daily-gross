import React from 'react';
import { Download } from 'lucide-react';
import { clsx } from 'clsx';

export default function SpvrWeeklyTab({ apiData, currentPage }) {
  let dates = [];
  let current7Dates = [];
  let previous7Dates = [];
  let spvrData = [];

  if (Array.isArray(apiData?.data)) {
    const rawData = apiData.data;

    // 1. Collect all unique dates and sort them
    const dateSet = new Set();
    rawData.forEach(item => {
      if (item.drawMonth && item.drawDay && item.drawYear) {
        const sortable = `${item.drawYear}-${String(item.drawMonth).padStart(2, '0')}-${String(item.drawDay).padStart(2, '0')}`;
        dateSet.add(sortable);
      }
    });
    
    const sortedDates = Array.from(dateSet).sort();
    current7Dates = sortedDates.slice(-7);
    previous7Dates = sortedDates.slice(-14, -7);

    dates = current7Dates.map(d => {
      const [y, m, day] = d.split('-');
      return `${m}-${day}-${y.slice(2)}`;
    });

    // 2. Group by supervisor
    const groups = {};
    const spvrMap = {};
    if (Array.isArray(apiData.supervisors)) {
      apiData.supervisors.forEach(s => spvrMap[s.id] = s.username?.toUpperCase() || s.fullName);
    }

    rawData.forEach(item => {
      if (!item.drawMonth) return;
      const groupName = spvrMap[item.supervisor] || item.location || 'UNKNOWN AREA';
      const sortableDate = `${item.drawYear}-${String(item.drawMonth).padStart(2, '0')}-${String(item.drawDay).padStart(2, '0')}`;
      
      if (!groups[groupName]) {
        groups[groupName] = {
          name: groupName,
          daysMap: {},
          current: 0,
          previous: 0
        };
      }
      
      const spvrObj = groups[groupName];
      const amount = item.TotalOverAllGross || 0;
      
      if (current7Dates.includes(sortableDate)) {
        spvrObj.daysMap[sortableDate] = (spvrObj.daysMap[sortableDate] || 0) + amount;
        spvrObj.current += amount;
      } else if (previous7Dates.includes(sortableDate)) {
        spvrObj.previous += amount;
      }
    });

    // 3. Format into final array
    spvrData = Object.values(groups).map(spvr => {
      const days = current7Dates.map(d => spvr.daysMap[d] || 0);
      return {
        name: spvr.name,
        days: days,
        current: spvr.current,
        previous: spvr.previous,
        shift: spvr.current - spvr.previous
      };
    }).sort((a, b) => b.current - a.current);
  }

  dates = dates.length > 0 ? dates : ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
  
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      <div className="bg-[#111827] rounded-3xl border border-slate-800 shadow-xl overflow-hidden mt-6">
        <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-[#111827]">
          <h3 className="text-[15px] font-extrabold tracking-wide text-white">SPVR WEEKLY SHIFT</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[#111827] border-b border-slate-800">
                <th className="py-5 px-8 font-extrabold text-[10px] text-slate-500 uppercase tracking-widest">SPVR IDENTITY</th>
                {dates.map((date, i) => (
                  <th key={i} className="py-5 px-4 font-extrabold text-[10px] text-slate-500 uppercase tracking-widest text-center">{date}</th>
                ))}
                <th className="py-5 px-6 font-extrabold text-[10px] text-indigo-500 uppercase tracking-widest text-center bg-[#0a0f18] border-l border-slate-800">TOTAL CURRENT<br/><span className="text-[9px] text-slate-600">(7D)</span></th>
                <th className="py-5 px-6 font-extrabold text-[10px] text-slate-500 uppercase tracking-widest text-center bg-[#0a0f18]">TOTAL PREVIOUS<br/><span className="text-[9px] text-slate-600">(7D)</span></th>
                <th className="py-5 px-8 font-extrabold text-[10px] text-slate-500 uppercase tracking-widest text-right bg-[#0a0f18]">SHIFT ANALYSIS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-[#111827]">
              {spvrData.map((row, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-5 px-8 text-xs font-extrabold text-white tracking-wide">{row.name}</td>
                  {row.days.map((val, i) => (
                    <td key={i} className="py-5 px-4 text-[11px] text-slate-400 text-center font-bold">₱{val?.toLocaleString()}</td>
                  ))}
                  <td className="py-5 px-6 text-[13px] text-white text-center font-extrabold bg-[#0a0f18]/30 border-l border-slate-800">₱{row.current?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="py-5 px-6 text-[13px] text-slate-500 text-center font-semibold bg-[#0a0f18]/30">₱{row.previous?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="py-5 px-8 text-[13px] text-right bg-[#0a0f18]/30">
                    <div className="flex items-center justify-end gap-3 min-w-[140px]">
                      {row.shift > 0 ? (
                        <span className="text-[9px] font-extrabold tracking-widest text-[#00b87c] uppercase">INCREASED</span>
                      ) : (
                        <span className="text-[9px] font-extrabold tracking-widest text-[#ff4e50] uppercase">DECREASED</span>
                      )}
                      <span className={clsx(
                        "font-extrabold text-sm w-20 text-right tracking-tight",
                        row.shift > 0 ? "text-[#00b87c]" : "text-[#ff4e50]"
                      )}>
                        {row.shift > 0 ? "+" : ""}{row.shift < 0 ? "-" : ""}₱{Math.abs(row.shift)?.toLocaleString()}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {spvrData.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 text-sm font-semibold">No data available for comparison</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
