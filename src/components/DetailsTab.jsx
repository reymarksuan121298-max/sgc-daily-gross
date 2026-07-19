import React from 'react';
import { Download } from 'lucide-react';
import { clsx } from 'clsx';
import { generateExcelReport } from '../utils/exportToExcel';
import { useAuth } from '../context/AuthContext';

export default function DetailsTab({ apiData, currentPage }) {
  const { user } = useAuth();
  let detailsData = apiData?.detailsData;
  let dates = apiData?.comparisonData?.dates;
  let current7Dates = apiData?.comparisonData?.current7Dates || [];
  let previous7Dates = apiData?.comparisonData?.previous7Dates || [];

  if (!detailsData && Array.isArray(apiData?.data)) {
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

    // Format dates for display header
    dates = current7Dates.map(d => {
      const [y, m, day] = d.split('-');
      return `${m}-${day}-${y.slice(2)}`;
    });

    // 2. Group by location -> teller
    const groups = {};
    const spvrMap = {};
    if (Array.isArray(apiData.supervisors)) {
      apiData.supervisors.forEach(s => spvrMap[s.id] = s.username?.toUpperCase() || s.fullName);
    }

    rawData.forEach(item => {
      if (!item.drawMonth) return;
      const groupName = spvrMap[item.supervisor] || item.location || 'UNKNOWN AREA';
      const tellerName = item.fullName || item.username;
      
      const sortableDate = `${item.drawYear}-${String(item.drawMonth).padStart(2, '0')}-${String(item.drawDay).padStart(2, '0')}`;
      
      if (!groups[groupName]) groups[groupName] = {};
      if (!groups[groupName][tellerName]) {
        groups[groupName][tellerName] = {
          name: tellerName,
          address: item.address || 'UNKNOWN',
          daysMap: {},
          current: 0,
          previous: 0
        };
      }
      
      const tellerData = groups[groupName][tellerName];
      const amount = item.TotalOverAllGross || 0;
      
      if (current7Dates.includes(sortableDate)) {
        tellerData.daysMap[sortableDate] = (tellerData.daysMap[sortableDate] || 0) + amount;
        tellerData.current += amount;
      } else if (previous7Dates.includes(sortableDate)) {
        tellerData.previous += amount;
      }
    });

    // 3. Format into final array
    detailsData = Object.keys(groups).sort().map(groupName => {
      let subDays = Array(7).fill(0);
      let subCurrent = 0;
      let subPrevious = 0;

      let tellers = Object.values(groups[groupName]).map(t => {
        const days = current7Dates.map(d => t.daysMap[d] || 0);
        
        // Add to subtotals
        days.forEach((val, i) => subDays[i] += val);
        subCurrent += t.current;
        subPrevious += t.previous;

        return {
          name: t.name,
          address: t.address,
          days: days,
          current: t.current,
          previous: t.previous,
          shift: t.current - t.previous
        };
      }).sort((a, b) => b.current - a.current);

      // Filter for striketeam (low grossers: daily average <= 1500, which means 7-day total <= 10500)
      if (user?.username === 'striketeam') {
        tellers = tellers.filter(t => (t.current / 7) <= 1500);
        
        // Recalculate subtotals for the filtered tellers
        subDays = Array(7).fill(0);
        subCurrent = 0;
        subPrevious = 0;
        tellers.forEach(t => {
          t.days.forEach((val, i) => subDays[i] += val);
          subCurrent += t.current;
          subPrevious += t.previous;
        });
      }

      return {
        supervisor: groupName,
        tellers: tellers,
        subtotals: {
          days: subDays,
          current: subCurrent,
          previous: subPrevious,
          shift: subCurrent - subPrevious
        }
      };
    }).filter(group => group.tellers.length > 0);
  }

  dates = dates || ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
  detailsData = detailsData || [];

  const handleDownload = async () => {
    const excelData = detailsData.map(group => ({
      spvrName: group.supervisor,
      tellers: group.tellers.map(t => {
        const daily = {};
        current7Dates.forEach((d, i) => daily[d] = t.days[i]);
        return {
          name: t.name,
          daily: daily,
          totalCurr: t.current,
          totalPrev: t.previous,
          difference: t.shift
        };
      })
    }));

    const regionName = currentPage === 'imp' ? 'IMPERIAL' : currentPage === 'setb' ? 'SETB' : currentPage === 'iligan' ? 'ILIGAN' : currentPage === 'lanao' ? 'LANAO' : currentPage === 'lotto' ? 'LOTTO' : currentPage === 'baloi' ? 'BALOI' : currentPage === 'lds' ? 'LDS' : 'MAG';
    await generateExcelReport(excelData, current7Dates, previous7Dates, regionName);
  };

  const handleDownloadLowGrossers = async () => {
    const excelData = detailsData.map(group => {
      const lowTellers = group.tellers.filter(t => (t.current / 7) <= 1500);
      if (lowTellers.length === 0) return null;
      return {
        spvrName: group.supervisor,
        tellers: lowTellers.map(t => {
          const daily = {};
          current7Dates.forEach((d, i) => daily[d] = t.days[i]);
          return {
            name: t.name,
            daily: daily,
            totalCurr: t.current,
            totalPrev: t.previous,
            difference: t.shift
          };
        })
      };
    }).filter(Boolean);

    const regionName = currentPage === 'imp' ? 'IMPERIAL' : currentPage === 'setb' ? 'SETB' : currentPage === 'iligan' ? 'ILIGAN' : currentPage === 'lanao' ? 'LANAO' : currentPage === 'lotto' ? 'LOTTO' : currentPage === 'baloi' ? 'BALOI' : currentPage === 'lds' ? 'LDS' : 'MAG';
    await generateExcelReport(excelData, current7Dates, previous7Dates, regionName + ' - LOW GROSSERS');
  };

  const handleDownloadHighGrossers = async () => {
    const todayIndex = current7Dates.length - 1;
    const excelData = detailsData.map(group => {
      // Filter based on TODAY's gross being high (e.g. > 1500)
      const highTellers = group.tellers.filter(t => t.days[todayIndex] > 1500);
      
      // Optional: Sort them from highest today's gross to lowest
      highTellers.sort((a, b) => b.days[todayIndex] - a.days[todayIndex]);

      if (highTellers.length === 0) return null;
      return {
        spvrName: group.supervisor,
        tellers: highTellers.map(t => {
          const daily = {};
          current7Dates.forEach((d, i) => daily[d] = t.days[i]);
          return {
            name: t.name,
            daily: daily,
            totalCurr: t.current,
            totalPrev: t.previous,
            difference: t.shift
          };
        })
      };
    }).filter(Boolean);

    const regionName = currentPage === 'imp' ? 'IMPERIAL' : currentPage === 'setb' ? 'SETB' : currentPage === 'iligan' ? 'ILIGAN' : currentPage === 'lanao' ? 'LANAO' : currentPage === 'lotto' ? 'LOTTO' : currentPage === 'baloi' ? 'BALOI' : currentPage === 'lds' ? 'LDS' : 'MAG';
    await generateExcelReport(excelData, current7Dates, previous7Dates, regionName + ' - HIGH GROSSERS (TODAY)');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button 
          onClick={handleDownloadLowGrossers}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-[0_0_15px_rgba(225,29,72,0.3)] text-sm"
        >
          <Download className="w-4 h-4" />
          Low Grossers per SPVR
        </button>
        <button 
          onClick={handleDownloadHighGrossers}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)] text-sm"
        >
          <Download className="w-4 h-4" />
          High Grossers Day by Day
        </button>
        <button 
          onClick={handleDownload}
          className="flex items-center gap-2 bg-white hover:bg-slate-200 text-slate-900 font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)] text-sm"
        >
          <Download className="w-4 h-4" />
          Download Analysis
        </button>
        <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] text-sm">
          <Download className="w-4 h-4" />
          Download with Address
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-cardBg rounded-xl border border-slate-700/50 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-textSecondary uppercase bg-[#172033] border-b border-slate-700/50">
              <tr>
                <th className="px-6 py-4 font-bold tracking-wider">TELLER IDENTITY</th>
                <th className="px-6 py-4 font-bold tracking-wider">ADDRESS</th>
                {dates.map((date, i) => (
                  <th key={i} className="px-4 py-4 text-center font-bold tracking-wider">{date}</th>
                ))}
                <th className="px-4 py-4 text-center font-bold tracking-wider bg-[#131b2c] border-l border-slate-700/50">TOTAL CURRENT<br/><span className="text-[10px] text-slate-500">(7D)</span></th>
                <th className="px-4 py-4 text-center font-bold tracking-wider bg-[#131b2c]">TOTAL PREVIOUS<br/><span className="text-[10px] text-slate-500">(7D)</span></th>
                <th className="px-6 py-4 text-center font-bold tracking-wider bg-[#131b2c] text-blue-400">SHIFT ANALYSIS</th>
              </tr>
            </thead>
            <tbody>
              {detailsData?.map((section, sIdx) => (
                <React.Fragment key={sIdx}>
                  {/* Section Header */}
                  <tr className="border-b border-slate-700/50 bg-[#1e293b]/50">
                    <td colSpan={12} className="px-6 py-3 font-bold text-indigo-400 text-xs tracking-wider uppercase">
                      {section.supervisor}
                    </td>
                  </tr>
                  {/* Rows */}
                  {section.tellers?.map((teller, tIdx) => (
                    <tr key={tIdx} className="border-b border-slate-700/50 hover:bg-[#253247] transition-colors">
                      <td className="px-6 py-4 font-semibold text-xs tracking-wide">{teller.name}</td>
                      <td className="px-6 py-4 text-xs text-textSecondary uppercase">{teller.address}</td>
                      {teller.days?.map((val, i) => (
                        <td key={i} className="px-4 py-4 text-center text-textSecondary text-xs">{val?.toLocaleString()}</td>
                      ))}
                      <td className="px-4 py-4 text-center font-bold bg-[#131b2c]/30 border-l border-slate-700/50 text-white">{teller.current?.toLocaleString()}</td>
                      <td className="px-4 py-4 text-center text-textSecondary bg-[#131b2c]/30 text-xs">{teller.previous?.toLocaleString()}</td>
                      <td className="px-6 py-4 bg-[#131b2c]/30 flex items-center justify-end gap-4 min-w-[150px]">
                        {teller.shift > 0 ? (
                          <span className="text-[10px] font-bold tracking-widest text-accentGreen uppercase">INCREASED</span>
                        ) : (
                          <span className="text-[10px] font-bold tracking-widest text-red-500 uppercase">DECREASED</span>
                        )}
                        <span className={clsx(
                          "font-bold text-sm w-16 text-right",
                          teller.shift > 0 ? "text-accentGreen" : "text-red-500"
                        )}>
                          {teller.shift > 0 ? "+" : ""}{teller.shift?.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Subtotal Row */}
                  <tr className="border-b border-slate-700/50 bg-[#1a2333]">
                    <td colSpan={2} className="px-6 py-4 font-bold text-yellow-500 text-xs tracking-wider uppercase">
                      SUBTOTAL : {section.supervisor}
                    </td>
                    {section.subtotals?.days.map((val, i) => (
                      <td key={i} className="px-4 py-4 text-center font-bold text-yellow-500 text-xs">{val?.toLocaleString()}</td>
                    ))}
                    <td className="px-4 py-4 text-center font-bold bg-[#131b2c]/30 border-l border-slate-700/50 text-yellow-500">{section.subtotals?.current?.toLocaleString()}</td>
                    <td className="px-4 py-4 text-center font-bold bg-[#131b2c]/30 text-yellow-500">{section.subtotals?.previous?.toLocaleString()}</td>
                    <td className="px-6 py-4 bg-[#131b2c]/30 flex items-center justify-end gap-4 min-w-[150px]">
                      <span className="text-[10px] font-bold tracking-widest text-textSecondary uppercase">COMBINED SHIFT</span>
                      <span className={clsx(
                        "font-bold text-sm w-16 text-right",
                        section.subtotals?.shift > 0 ? "text-accentGreen" : "text-red-500"
                      )}>
                        {section.subtotals?.shift > 0 ? "+" : ""}{section.subtotals?.shift?.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
