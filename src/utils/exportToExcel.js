import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const generateExcelReport = async (data, currentDates, previousDates, regionName = 'MAGUINDANAO') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Daily Report');

  // Format dates for title (e.g. "Jul 01-14 2026")
  const formatDateTitle = (dates) => {
    if (!dates || dates.length === 0) return '';
    const d1 = new Date(dates[0]);
    const d2 = new Date(dates[dates.length - 1]);
    const monthStr = d1.toLocaleString('default', { month: 'short' });
    return `${monthStr} ${String(d1.getDate()).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')} ${d1.getFullYear()}`;
  };

  const currentDatesTitle = formatDateTitle(currentDates);
  const prevDateRangeStr = formatDateTitle(previousDates).split(' ')[1] || ''; // e.g. "04-10"
  const prevMonthStr = previousDates.length > 0 ? new Date(previousDates[0]).toLocaleString('default', { month: 'short' }) : '';

  // Title Rows
  worksheet.mergeCells('A1:M1');
  worksheet.getCell('A1').value = `Daily Report of ${currentDatesTitle} ${regionName}`;
  worksheet.getCell('A1').font = { bold: true, size: 14 };
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A2:M2');
  worksheet.getCell('A2').value = `Agent Sales Per Day`;
  worksheet.getCell('A2').font = { size: 12 };
  worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  // Set Column Widths
  worksheet.columns = [
    { key: 'spvr', width: 25 },
    { key: 'teller', width: 30 },
    { key: 'day1', width: 10 },
    { key: 'day2', width: 10 },
    { key: 'day3', width: 10 },
    { key: 'day4', width: 10 },
    { key: 'day5', width: 10 },
    { key: 'day6', width: 10 },
    { key: 'day7', width: 10 },
    { key: 'totalCurr', width: 15 },
    { key: 'totalPrev', width: 15 },
    { key: 'analysis', width: 12 },
    { key: 'difference', width: 15 }
  ];

  // Header Row 1 (Row 3)
  const headerRow1 = worksheet.getRow(3);
  headerRow1.values = [
    'SPVR', 'Date', 
    ...currentDates.map(d => {
      const dd = new Date(d);
      return `${dd.toLocaleString('default', { month: 'short' })}${dd.getDate()}`;
    }),
    'Total Current', 'Total Previous', 'Analysis', 'Difference'
  ];

  // Header Row 2 (Row 4)
  const headerRow2 = worksheet.getRow(4);
  headerRow2.values = [
    '', 'Teller', 
    'Gross', 'Gross', 'Gross', 'Gross', 'Gross', 'Gross', 'Gross',
    '', `${prevMonthStr}${prevDateRangeStr}`, '', ''
  ];

  // Styling Header Row 1
  headerRow1.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } }; // Cyan
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // Styling Header Row 2
  headerRow2.eachCell((cell, colNumber) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };
    
    // Days columns (C-I, i.e., 3-9) are Red
    if (colNumber >= 3 && colNumber <= 9) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } }; // Red
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // White text on red looks better, or leave black if required
    } else if (colNumber === 2) { // Teller cell is cyan
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } }; // Cyan
    }
  });

  let currentRow = 5;

  data.forEach((group) => {
    // Unit Totals
    let unitTotals = {
      day1: 0, day2: 0, day3: 0, day4: 0, day5: 0, day6: 0, day7: 0,
      totalCurr: 0, totalPrev: 0, difference: 0
    };

    // Write Supervisor Name in Col A, Row N
    const spvrRow = worksheet.getRow(currentRow);
    spvrRow.getCell(1).value = group.spvrName;
    spvrRow.getCell(1).font = { bold: true };
    spvrRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Group Tellers
    group.tellers.forEach((teller, index) => {
      const tRow = index === 0 ? spvrRow : worksheet.getRow(currentRow);
      
      const dayValues = currentDates.map(d => teller.daily[d] || 0);
      
      tRow.getCell(2).value = teller.name;
      tRow.getCell(3).value = dayValues[0];
      tRow.getCell(4).value = dayValues[1];
      tRow.getCell(5).value = dayValues[2];
      tRow.getCell(6).value = dayValues[3];
      tRow.getCell(7).value = dayValues[4];
      tRow.getCell(8).value = dayValues[5];
      tRow.getCell(9).value = dayValues[6];
      tRow.getCell(10).value = teller.totalCurr;
      tRow.getCell(11).value = teller.totalPrev;
      
      const analysisCell = tRow.getCell(12);
      analysisCell.value = teller.totalCurr > teller.totalPrev ? 'Increased' : 'Decreased';
      analysisCell.font = { color: { argb: teller.totalCurr > teller.totalPrev ? 'FF0000FF' : 'FFFF0000' }, bold: true }; // Blue for increase
      
      const diffCell = tRow.getCell(13);
      diffCell.value = teller.difference;
      diffCell.font = { color: { argb: teller.difference < 0 ? 'FFFF0000' : 'FF0000FF' }, bold: true };

      // Number formatting
      for (let c = 3; c <= 11; c++) {
        tRow.getCell(c).numFmt = '#,##0';
      }
      diffCell.numFmt = '#,##0';

      // Borders
      tRow.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      // Accumulate Unit Totals
      unitTotals.day1 += dayValues[0];
      unitTotals.day2 += dayValues[1];
      unitTotals.day3 += dayValues[2];
      unitTotals.day4 += dayValues[3];
      unitTotals.day5 += dayValues[4];
      unitTotals.day6 += dayValues[5];
      unitTotals.day7 += dayValues[6];
      unitTotals.totalCurr += teller.totalCurr;
      unitTotals.totalPrev += teller.totalPrev;
      unitTotals.difference += teller.difference;

      currentRow++;
    });

    // Unit Total Row
    const totalRow = worksheet.getRow(currentRow);
    totalRow.values = [
      'Total :', '',
      unitTotals.day1, unitTotals.day2, unitTotals.day3, unitTotals.day4, 
      unitTotals.day5, unitTotals.day6, unitTotals.day7,
      unitTotals.totalCurr, unitTotals.totalPrev, '', unitTotals.difference
    ];

    totalRow.eachCell((cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Yellow
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      if (typeof cell.value === 'number') {
        cell.numFmt = '#,##0';
      }
      if (colNumber === 13) {
        cell.font = { bold: true, color: { argb: unitTotals.difference < 0 ? 'FFFF0000' : 'FF0000FF' } };
      }
    });
    totalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    
    // Add a blank row between supervisors for clean separation
    currentRow += 2;
  });

  // Write file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${regionName.replace(/ /g, '_')}_Weekly_Gross_Sales_${currentDatesTitle.replace(/ /g, '_')}.xlsx`);
};

export const generateSpvrWeeklyExcelReport = async (data, currentDates, previousDates, regionName = 'MAGUINDANAO') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('SPVR Weekly Report');

  // Format dates for title (e.g. "Jul 01-14 2026")
  const formatDateTitle = (dates) => {
    if (!dates || dates.length === 0) return '';
    const d1 = new Date(dates[0]);
    const d2 = new Date(dates[dates.length - 1]);
    const monthStr = d1.toLocaleString('default', { month: 'short' });
    return `${monthStr} ${String(d1.getDate()).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')} ${d1.getFullYear()}`;
  };

  const currentDatesTitle = formatDateTitle(currentDates);
  const prevDateRangeStr = formatDateTitle(previousDates).split(' ')[1] || ''; // e.g. "04-10"
  const prevMonthStr = previousDates.length > 0 ? new Date(previousDates[0]).toLocaleString('default', { month: 'short' }) : '';

  // Title Rows
  worksheet.mergeCells('A1:L1');
  worksheet.getCell('A1').value = `SPVR Weekly Report of ${currentDatesTitle} ${regionName}`;
  worksheet.getCell('A1').font = { bold: true, size: 14 };
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A2:L2');
  worksheet.getCell('A2').value = `SPVR Sales Per Day`;
  worksheet.getCell('A2').font = { size: 12 };
  worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  // Set Column Widths
  worksheet.columns = [
    { key: 'spvr', width: 35 },
    { key: 'day1', width: 12 },
    { key: 'day2', width: 12 },
    { key: 'day3', width: 12 },
    { key: 'day4', width: 12 },
    { key: 'day5', width: 12 },
    { key: 'day6', width: 12 },
    { key: 'day7', width: 12 },
    { key: 'totalCurr', width: 15 },
    { key: 'totalPrev', width: 15 },
    { key: 'analysis', width: 12 },
    { key: 'difference', width: 15 }
  ];

  // Header Row 1 (Row 3)
  const headerRow1 = worksheet.getRow(3);
  headerRow1.values = [
    'SPVR',
    ...currentDates.map(d => {
      const dd = new Date(d);
      return `${dd.toLocaleString('default', { month: 'short' })}${dd.getDate()}`;
    }),
    'Total Current', 'Total Previous', 'Analysis', 'Difference'
  ];

  // Header Row 2 (Row 4)
  const headerRow2 = worksheet.getRow(4);
  headerRow2.values = [
    '',
    'Gross', 'Gross', 'Gross', 'Gross', 'Gross', 'Gross', 'Gross',
    '', `${prevMonthStr}${prevDateRangeStr}`, '', ''
  ];

  // Styling Header Row 1
  headerRow1.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } }; // Cyan
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // Styling Header Row 2
  headerRow2.eachCell((cell, colNumber) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };
    
    // Days columns (B-H, i.e., 2-8) are Red
    if (colNumber >= 2 && colNumber <= 8) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } }; // Red
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    }
  });

  let currentRow = 5;
  let grandTotals = {
    day1: 0, day2: 0, day3: 0, day4: 0, day5: 0, day6: 0, day7: 0,
    totalCurr: 0, totalPrev: 0, difference: 0
  };

  data.forEach((spvr) => {
    const spvrRow = worksheet.getRow(currentRow);
    
    const dayValues = currentDates.map(d => spvr.daily[d] || 0);
    
    spvrRow.getCell(1).value = spvr.name;
    spvrRow.getCell(2).value = dayValues[0];
    spvrRow.getCell(3).value = dayValues[1];
    spvrRow.getCell(4).value = dayValues[2];
    spvrRow.getCell(5).value = dayValues[3];
    spvrRow.getCell(6).value = dayValues[4];
    spvrRow.getCell(7).value = dayValues[5];
    spvrRow.getCell(8).value = dayValues[6];
    spvrRow.getCell(9).value = spvr.totalCurr;
    spvrRow.getCell(10).value = spvr.totalPrev;
    
    const analysisCell = spvrRow.getCell(11);
    analysisCell.value = spvr.totalCurr > spvr.totalPrev ? 'Increased' : 'Decreased';
    analysisCell.font = { color: { argb: spvr.totalCurr > spvr.totalPrev ? 'FF0000FF' : 'FFFF0000' }, bold: true };
    
    const diffCell = spvrRow.getCell(12);
    diffCell.value = spvr.difference;
    diffCell.font = { color: { argb: spvr.difference < 0 ? 'FFFF0000' : 'FF0000FF' }, bold: true };

    // Number formatting
    for (let c = 2; c <= 10; c++) {
      spvrRow.getCell(c).numFmt = '#,##0';
    }
    diffCell.numFmt = '#,##0';

    // Borders
    spvrRow.eachCell((cell) => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    // Accumulate Grand Totals
    grandTotals.day1 += dayValues[0];
    grandTotals.day2 += dayValues[1];
    grandTotals.day3 += dayValues[2];
    grandTotals.day4 += dayValues[3];
    grandTotals.day5 += dayValues[4];
    grandTotals.day6 += dayValues[5];
    grandTotals.day7 += dayValues[6];
    grandTotals.totalCurr += spvr.totalCurr;
    grandTotals.totalPrev += spvr.totalPrev;
    grandTotals.difference += spvr.difference;

    currentRow++;
  });

  // Grand Total Row
  const totalRow = worksheet.getRow(currentRow);
  totalRow.values = [
    'GRAND TOTAL',
    grandTotals.day1, grandTotals.day2, grandTotals.day3, grandTotals.day4, 
    grandTotals.day5, grandTotals.day6, grandTotals.day7,
    grandTotals.totalCurr, grandTotals.totalPrev, '', grandTotals.difference
  ];

  totalRow.eachCell((cell, colNumber) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Yellow
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    if (typeof cell.value === 'number') {
      cell.numFmt = '#,##0';
    }
    if (colNumber === 12) {
      cell.font = { bold: true, color: { argb: grandTotals.difference < 0 ? 'FFFF0000' : 'FF0000FF' } };
    }
  });
  totalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

  // Write file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${regionName.replace(/ /g, '_')}_SPVR_Weekly_Gross_${currentDatesTitle.replace(/ /g, '_')}.xlsx`);
};
