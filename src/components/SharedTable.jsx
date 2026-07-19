import React from 'react';
import { Download } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function SharedTable({ title, col1Header, col2Header, data, exportFilename }) {
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Analysis');

    worksheet.columns = [
      { header: 'SUPERVISING AREA', key: 'area', width: 35 },
      { header: col1Header || 'PREVIOUS MONTH', key: 'prev', width: 20 },
      { header: col2Header || 'CURRENT MONTH', key: 'curr', width: 20 },
      { header: 'NET CHANGE', key: 'change', width: 20 },
      { header: 'TREND ANALYSIS (%)', key: 'trend', width: 20 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

    data.forEach(row => {
      worksheet.addRow({
        area: row.area,
        prev: row.prev,
        curr: row.curr,
        change: row.change,
        trend: row.trend
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, exportFilename || 'Export_Analysis.xlsx');
  };

  return (
    <div className="bg-surface rounded-3xl border border-border-divider shadow-xl overflow-hidden mt-6 animate-in fade-in duration-300">
      <div className="px-8 py-6 border-b border-border-divider flex justify-between items-center bg-surface">
        <h3 className="text-[15px] font-extrabold tracking-wide text-textPrimary">{title}</h3>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#00b87c] text-textPrimary rounded-lg hover:bg-[#00a36d] transition-colors text-[10px] font-extrabold tracking-widest uppercase shadow-[0_0_15px_rgba(0,184,124,0.3)]"
        >
          <Download className="w-3.5 h-3.5" />
          Export Analysis
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border-divider">
              <th className="py-5 px-8 font-extrabold text-[10px] text-textSecondary uppercase tracking-widest">Supervising Area</th>
              <th className="py-5 px-8 font-extrabold text-[10px] text-textSecondary uppercase tracking-widest text-center">Previous Month</th>
              <th className="py-5 px-8 font-extrabold text-[10px] text-indigo-500 uppercase tracking-widest text-center">Current Month</th>
              <th className="py-5 px-8 font-extrabold text-[10px] text-textSecondary uppercase tracking-widest text-center">Net Change</th>
              <th className="py-5 px-8 font-extrabold text-[10px] text-textSecondary uppercase tracking-widest text-right">Trend Analysis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-divider bg-surface">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-surface-hover transition-colors">
                <td className="py-5 px-8 text-xs font-extrabold text-textPrimary tracking-wide">{row.area}</td>
                <td className="py-5 px-8 text-[13px] text-textSecondary text-center font-semibold">₱{row.prev?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td className="py-5 px-8 text-[13px] text-textPrimary text-center font-extrabold">₱{row.curr?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td className="py-5 px-8 text-[13px] text-center font-extrabold">
                  <span className={row.change >= 0 ? "text-[#00b87c]" : "text-[#ff4e50]"}>
                    {row.change > 0 ? "+" : ""}{row.change < 0 ? "-" : ""}₱{Math.abs(row.change)?.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </span>
                </td>
                <td className="py-5 px-8 text-[13px] text-right">
                  <div className="flex justify-end">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold tracking-wider ${row.trend >= 0 ? "bg-[#00b87c]/10 text-[#00b87c]" : "bg-[#ff4e50]/10 text-[#ff4e50]"}`}>
                      {row.trend > 0 ? "+" : ""}{row.trend?.toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan="5" className="py-12 text-center text-textSecondary text-sm font-semibold">No data available for comparison</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
