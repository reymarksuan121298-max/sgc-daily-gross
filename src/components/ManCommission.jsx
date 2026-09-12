import React, { useState } from 'react';
import { manCommissionGroups } from '../utils/format';
import { Download } from 'lucide-react';

export default function ManCommission({ apiData, selectedEndDate }) {
  // Extract data from apiData
  if (!apiData || !apiData.data) {
    return <div className="text-center p-4 text-textSecondary">No data available</div>;
  }

  // Pre-load all target groups with mapped tellers starting at 0 gross
  const groupData = {};
  Object.keys(manCommissionGroups).forEach(groupKey => {
    groupData[groupKey] = manCommissionGroups[groupKey].map(name => ({
      name,
      amount: 0
    }));
  });

  // Cross-reference incoming API data specifically against our formatting list
  apiData.data.forEach(item => {
    const rawName = (item.fullName || item.username || '').toUpperCase().trim();
    if (!rawName) return;

    for (const groupKey of Object.keys(groupData)) {
      const match = groupData[groupKey].find(t => {
        const targetName = t.name.toUpperCase();
        return targetName === rawName || rawName.includes(targetName) || targetName.includes(rawName);
      });
      if (match) {
        match.amount += (item.TotalOverAllGross || 0);
        break; // Stop searching once matched
      }
    }
  });

  let formattedDate = 'Aug24';
  if (selectedEndDate) {
    const d = new Date(selectedEndDate);
    if (!isNaN(d.valueOf())) {
      const m = d.toLocaleString('default', { month: 'short' });
      const day = d.getDate().toString().padStart(2, '0');
      formattedDate = `${m}${day}`;
    }
  }

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = (await import('file-saver')).default || await import('file-saver');

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('MAN Commission');

      const excelColumnsLayout = [
        ['RWS', 'COORDINATOR: LONGWIND'],
        ['PNP COMMISION', 'COORDINATOR: KAPITAN', 'SPVR-APPLE'],
        ['COORDINATOR: GROUP C', 'COORDINATOR: GROUP D', 'COORDINATOR: GROUP G', 'COORDINATOR: GROUP EDIK'],
        ['SPVR-MOLLY']
      ];

      // Excel Columns matching exactly to UI: A=1, D=4, G=7, J=10
      const colOffsets = [1, 4, 7, 10]; 

      excelColumnsLayout.forEach((colGroup, colIdx) => {
        let currentRow = 2; // Leave row 1 blank padding
        const baseCol = colOffsets[colIdx];

        colGroup.forEach(groupKey => {
          const tellers = groupData[groupKey].sort((a, b) => b.amount - a.amount);
          const totalAmount = tellers.reduce((acc, curr) => acc + curr.amount, 0);

          // Group Header
          sheet.mergeCells(currentRow, baseCol, currentRow, baseCol + 1);
          const titleCell = sheet.getCell(currentRow, baseCol);
          titleCell.value = groupKey;
          titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
          titleCell.font = { bold: true };
          titleCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          currentRow++;

          // Date Row
          sheet.getCell(currentRow, baseCol).value = 'Date';
          sheet.getCell(currentRow, baseCol + 1).value = formattedDate;
          sheet.getCell(currentRow, baseCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } }; 
          sheet.getCell(currentRow, baseCol + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } };
          sheet.getCell(currentRow, baseCol).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          sheet.getCell(currentRow, baseCol + 1).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          sheet.getCell(currentRow, baseCol).alignment = { horizontal: 'center', vertical: 'middle' };
          sheet.getCell(currentRow, baseCol + 1).alignment = { horizontal: 'center', vertical: 'middle' };
          currentRow++;

          // Teller / Gross Header
          sheet.getCell(currentRow, baseCol).value = 'Teller';
          sheet.getCell(currentRow, baseCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } };
          sheet.getCell(currentRow, baseCol).font = { bold: true };
          sheet.getCell(currentRow, baseCol).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          sheet.getCell(currentRow, baseCol).alignment = { horizontal: 'center', vertical: 'middle' };

          sheet.getCell(currentRow, baseCol + 1).value = 'Gross';
          sheet.getCell(currentRow, baseCol + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
          sheet.getCell(currentRow, baseCol + 1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
          sheet.getCell(currentRow, baseCol + 1).alignment = { horizontal: 'center', vertical: 'middle' };
          sheet.getCell(currentRow, baseCol + 1).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          currentRow++;

          // Teller Records
          if (tellers.length > 0) {
            tellers.forEach(t => {
              sheet.getCell(currentRow, baseCol).value = t.name;
              sheet.getCell(currentRow, baseCol + 1).value = t.amount;
              sheet.getCell(currentRow, baseCol + 1).numFmt = '#,##0'; // Number comma formatting
              sheet.getCell(currentRow, baseCol).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
              sheet.getCell(currentRow, baseCol + 1).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
              currentRow++;
            });
          } else {
            sheet.mergeCells(currentRow, baseCol, currentRow, baseCol + 1);
            const noDataCell = sheet.getCell(currentRow, baseCol);
            noDataCell.value = 'No Data';
            noDataCell.alignment = { horizontal: 'center', vertical: 'middle' };
            noDataCell.font = { italic: true, color: { argb: 'FF888888' } };
            noDataCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            currentRow++;
          }

          // Footer TOAL summary
          sheet.getCell(currentRow, baseCol).value = 'TOAL';
          sheet.getCell(currentRow, baseCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EAD4' } }; 
          sheet.getCell(currentRow, baseCol).alignment = { horizontal: 'center', vertical: 'middle' };
          sheet.getCell(currentRow, baseCol).font = { bold: true };
          sheet.getCell(currentRow, baseCol).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

          sheet.getCell(currentRow, baseCol + 1).value = totalAmount;
          sheet.getCell(currentRow, baseCol + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EAD4' } };
          sheet.getCell(currentRow, baseCol + 1).numFmt = '#,##0';
          sheet.getCell(currentRow, baseCol + 1).font = { bold: true };
          sheet.getCell(currentRow, baseCol + 1).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

          currentRow += 2; // Two blank rows separating tables vertically inside the same column
        });
      });

      // Fit column widths
      [1, 4, 7, 10].forEach(colIdx => sheet.getColumn(colIdx).width = 25);
      [2, 5, 8, 11].forEach(colIdx => sheet.getColumn(colIdx).width = 12);
      [3, 6, 9].forEach(colIdx => sheet.getColumn(colIdx).width = 3); // Gaps between the 4 main grids

      // Export file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `MAN_Commission_${formattedDate}.xlsx`);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export to Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  const columnsLayout = [
    ['RWS', 'COORDINATOR: LONGWIND'],
    ['PNP COMMISION', 'COORDINATOR: KAPITAN', 'SPVR-APPLE'],
    ['COORDINATOR: GROUP C', 'COORDINATOR: GROUP D', 'COORDINATOR: GROUP G', 'COORDINATOR: GROUP EDIK'],
    ['SPVR-MOLLY']
  ];
  
  return (
    <div className="p-4 overflow-x-auto glass-card rounded-2xl min-h-screen">
      <div className="flex justify-between items-center mb-8 relative z-10 w-full">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
          <h2 className="text-xl font-bold tracking-wide text-textPrimary">MAN COMMISSION REPORT</h2>
        </div>
        <button 
          onClick={handleExport} 
          disabled={isExporting}
          className="flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 font-medium px-4 py-2 rounded-lg transition-colors border border-indigo-500/30 shadow-lg disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Exporting...' : 'Export to Excel'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {columnsLayout.map((colGroup, colIdx) => (
          <div key={`col-${colIdx}`} className="flex flex-col gap-6">
            {colGroup.map(groupKey => {
              const tellers = groupData[groupKey].sort((a, b) => b.amount - a.amount);
              const totalAmount = tellers.reduce((acc, curr) => acc + curr.amount, 0);
              
              return (
                <div key={groupKey} className="w-full shadow-lg rounded overflow-hidden">
                  <h3 className="text-center font-bold text-xs bg-white text-black py-1 border-b-2 border-black">{groupKey}</h3>
                  <table className="w-full border-collapse border border-black text-[10px]">
                    <thead>
                      <tr className="bg-[#00ffff] text-black">
                        <th className="border border-black p-1 font-semibold w-2/3">Date</th>
                        <th className="border border-black p-1 font-semibold w-1/3">{formattedDate}</th>
                      </tr>
                      <tr className="text-black">
                        <th className="bg-[#00ffff] border border-black p-1 font-bold">Teller</th>
                        <th className="bg-[#ff0000] border border-black p-1 font-bold text-white">Gross</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white text-black">
                      {tellers.length > 0 ? (
                        tellers.map((t, idx) => (
                          <tr key={idx} className="hover:bg-gray-100 transition-colors duration-150">
                            <td className="border border-black p-1 px-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]" title={t.name}>{t.name}</td>
                            <td className="border border-black p-1 px-2 text-right">{t.amount.toLocaleString(undefined, {minimumFractionDigits: 0})}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="2" className="border border-black p-2 text-center text-gray-400 italic">No Data</td>
                        </tr>
                      )}
                      <tr className="bg-[#e2ead4] text-black font-extrabold uppercase outline outline-1 outline-black">
                        <td className="border-r border-black p-1 px-2 text-center align-middle h-8">TOAL</td>
                        <td className="p-1 px-2 text-right align-middle h-8">{totalAmount.toLocaleString(undefined, {minimumFractionDigits: 0})}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
