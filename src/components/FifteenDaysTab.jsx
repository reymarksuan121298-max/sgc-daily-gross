import React from 'react';
import SharedTable from './SharedTable';

export default function FifteenDaysTab({ apiData, selectedEndDate, currentPage }) {
  const regionName = currentPage === 'imp' ? 'IMPERIAL' : currentPage === 'setb' ? 'SETB' : currentPage === 'iligan' ? 'ILIGAN' : currentPage === 'lanao' ? 'LANAO' : currentPage === 'lotto' ? 'LOTTO' : currentPage === 'baloi' ? 'BALOI' : currentPage === 'lds' ? 'LDS' : 'MAG';
  const rawData = apiData?.data || [];
  const spvrMap = {};
  if (Array.isArray(apiData?.supervisors)) {
    apiData.supervisors.forEach(s => spvrMap[s.id] = s.username?.toUpperCase() || s.fullName);
  }

  // Determine current month and year based on selectedEndDate or current date
  let refDate = selectedEndDate ? new Date(selectedEndDate) : new Date();
  if (isNaN(refDate.getTime())) refDate = new Date();

  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth() + 1; // 1-12

  let prevDate = new Date(refDate);
  prevDate.setMonth(refDate.getMonth() - 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth() + 1;

  let prev15Total = 0;
  let curr15Total = 0;
  const groups = {};

  rawData.forEach(item => {
    const amount = item.TotalOverAllGross || 0;
    const groupName = spvrMap[item.supervisor] || item.location || 'UNKNOWN AREA';
    const day = item.drawDay;
    const month = item.drawMonth;
    const year = item.drawYear;

    if (!groups[groupName]) {
      groups[groupName] = { area: groupName, prev: 0, curr: 0 };
    }

    if (day >= 1 && day <= 15) {
      if (year === currentYear && month === currentMonth) {
        groups[groupName].curr += amount;
        curr15Total += amount;
      } else if (year === prevYear && month === prevMonth) {
        groups[groupName].prev += amount;
        prev15Total += amount;
      }
    }
  });

  const shiftPercent = prev15Total === 0 ? (curr15Total > 0 ? 100 : 0) : ((curr15Total - prev15Total) / prev15Total) * 100;

  const tableData = Object.values(groups).map(g => ({
    area: g.area,
    prev: g.prev,
    curr: g.curr,
    change: g.curr - g.prev,
    trend: g.prev === 0 ? (g.curr > 0 ? 100 : 0) : ((g.curr - g.prev) / g.prev) * 100
  })).sort((a, b) => b.curr - a.curr);

  const formatPaddedDate = (y, m, d) => {
    return `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}-${String(y).slice(-2)}`;
  }
  const currLabel = `${formatPaddedDate(currentYear, currentMonth, 1)} TO ${formatPaddedDate(currentYear, currentMonth, 15)}`;
  const prevLabel = `${formatPaddedDate(prevYear, prevMonth, 1)} TO ${formatPaddedDate(prevYear, prevMonth, 15)}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      <div className="bg-surface rounded-3xl p-10 py-12 border border-border-divider shadow-xl mb-6 relative">
        <h3 className="text-[17px] font-extrabold tracking-wide text-textPrimary text-center mb-14">15 Days Comparison (1st-15th)</h3>

        <div className="flex justify-between items-start w-full relative z-10">
          <div className="text-left w-1/3">
            <p className="text-[9px] font-extrabold text-textSecondary uppercase tracking-widest mb-1.5">PREVIOUS MONTH</p>
            <p className="text-[11px] text-indigo-300/80 font-extrabold mb-3">{prevLabel}</p>
            <p className="text-[32px] font-extrabold text-textPrimary">₱{prev15Total.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          </div>

          <div className="w-1/3 flex justify-center pt-8">
            <span className="text-[10px] font-bold text-textSecondary/70 tracking-widest">VS</span>
          </div>

          <div className="text-right w-1/3">
            <p className="text-[9px] font-extrabold text-indigo-500/90 uppercase tracking-widest mb-1.5">CURRENT MONTH</p>
            <p className="text-[11px] text-indigo-300/80 font-extrabold mb-3">{currLabel}</p>
            <p className="text-[32px] font-extrabold text-textPrimary">₱{curr15Total.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          </div>
        </div>

        <div className="flex justify-center mt-12 mb-2">
          <div className={`px-12 py-5 rounded-[20px] flex flex-col items-center justify-center min-w-[220px]
            ${shiftPercent >= 0 ? 'bg-[#00b87c]/10' : 'bg-[#2a131c]'}
          `}>
            <p className={`text-[32px] font-extrabold leading-none mb-2 tracking-tight ${shiftPercent >= 0 ? 'text-[#00b87c]' : 'text-[#ff4e50]'}`}>
              {shiftPercent > 0 ? "+" : ""}{shiftPercent.toFixed(1)}%
            </p>
            <p className={`text-[9px] font-extrabold tracking-widest uppercase ${shiftPercent >= 0 ? 'text-[#00b87c]' : 'text-[#ff4e50]'}`}>
              NET SHIFT (1ST-15TH)
            </p>
          </div>
        </div>
      </div>

      <SharedTable 
        title="15 Days Unit Shift (1st-15th)" 
        exportFilename={`${regionName}_15_Days_Analysis.xlsx`}
        data={tableData} 
      />
    </div>
  );
}
