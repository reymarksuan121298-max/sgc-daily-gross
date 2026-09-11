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

export const generateSpvrWeeklyExcelReport = async (data, currentDates, previousDates, regionName = 'MAGUINDANAO', currentPage = 'mag') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('SPVR Weekly Report');

  const formatDateTitle = (dates) => {
    if (!dates || dates.length === 0) return '';
    const d1 = new Date(dates[0]);
    const d2 = new Date(dates[dates.length - 1]);
    const monthStr = d1.toLocaleString('default', { month: 'short' });
    return `${monthStr} ${String(d1.getDate()).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')} ${d1.getFullYear()}`;
  };

  const formatShortDateRange = (dates) => {
    if (!dates || dates.length === 0) return '';
    const d1 = new Date(dates[0]);
    const d2 = new Date(dates[dates.length - 1]);
    return `${d1.toLocaleString('default', { month: 'short' })}${d1.getDate()} - ${d2.toLocaleString('default', { month: 'short' })}${d2.getDate()}`;
  };

  const currentDatesTitle = formatDateTitle(currentDates);
  const prevDateLabel = formatShortDateRange(previousDates);
  const currDateLabel = formatShortDateRange(currentDates);

  const classifyArea = (spvrName) => {
    const nameStr = String(spvrName || '');
    const nameLower = nameStr.toLowerCase();

    if (nameLower.includes('parang')) return 'PARANG';
    if (nameLower.includes('southupi') || nameLower.includes('south upi') || nameLower.includes('south-upi')) return 'SOUTH UPI';
    if (nameLower.includes('dos') || nameLower.includes('awang') || nameLower.includes('dalican')) return 'AWANG';
    if (nameLower.includes('nkabuntalan') || nameLower.includes('north kabuntalan') || nameLower.includes('kabuntalan')) return 'NORTH KABUNTALAN';
    if (nameLower.includes('upi') || nameLower.includes('dbs')) return 'NORTH UPI';
    
    if (currentPage === 'mag' || regionName === 'MAG' || regionName === 'MAGUINDANAO' || regionName === 'IMPERIAL') {
      return 'MAG SUR';
    }
    return regionName || 'GENERAL AREA';
  };

  const areaGroups = {};

  data.forEach(spvr => {
    const areaName = classifyArea(spvr.name);
    if (!areaGroups[areaName]) areaGroups[areaName] = [];
    areaGroups[areaName].push(spvr);
  });

  const defaultAreaOrder = ['MAG SUR', 'PARANG', 'AWANG', 'SOUTH UPI', 'NORTH KABUNTALAN', 'NORTH UPI'];
  const presentAreas = Object.keys(areaGroups);

  const sortedAreas = presentAreas.sort((a, b) => {
    const indexA = defaultAreaOrder.indexOf(a);
    const indexB = defaultAreaOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  const numCols = 5; 
  
  worksheet.columns = [
    { key: 'spvr', width: 35 },
    { key: 'totalPrev', width: 25 },
    { key: 'totalCurr', width: 25 },
    { key: 'change', width: 18 },
    { key: 'trend', width: 15 }
  ];

  const formatOverallDateRange = (datesFrom, datesTo) => {
    if (!datesFrom.length || !datesTo.length) return '';
    const d1 = new Date(datesFrom[0]);
    const d2 = new Date(datesTo[datesTo.length - 1]);
    return `${d1.toLocaleString('default', { month: 'short' })}${d1.getDate()} - ${d2.toLocaleString('default', { month: 'short' })}${d2.getDate()} ${d2.getFullYear()}`;
  };

  const overallDateLabel = formatOverallDateRange(previousDates, currentDates);

  let currentRow = 1;

  worksheet.mergeCells(currentRow, 1, currentRow, numCols);
  const mainTitleCell = worksheet.getCell(currentRow, 1);
  mainTitleCell.value = `SPVR Weekly ${overallDateLabel}`;
  mainTitleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  mainTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } }; // Dark Navy
  mainTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 1; c <= numCols; c++) {
    worksheet.getCell(currentRow, c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  }
  
  currentRow += 2;

  sortedAreas.forEach(areaName => {
    const spvrList = areaGroups[areaName];

    // 1. Area Header Row (Light Green)
    worksheet.mergeCells(currentRow, 1, currentRow, numCols);
    const areaHeaderCell = worksheet.getCell(currentRow, 1);
    areaHeaderCell.value = areaName;
    areaHeaderCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
    areaHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };

    for (let col = 1; col <= numCols; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6E0B4' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    }
    currentRow++;

    // 2. Column Header Row (Dark Navy)
    const headerRow = worksheet.getRow(currentRow);
    headerRow.values = [
      'SPVR',
      `Previous (${prevDateLabel})`,
      `Current (${currDateLabel})`,
      'Change',
      'Trend %'
    ];

    headerRow.eachCell((cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: colNumber === 1 ? 'center' : 'right', vertical: 'middle' };
      if (colNumber === 1) cell.alignment = { horizontal: 'left', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    currentRow++;

    const dataStartRow = currentRow;

    // 3. Data Rows
    spvrList.forEach(spvr => {
      const dataRow = worksheet.getRow(currentRow);
      const prevVal = spvr.totalPrev;
      const currVal = spvr.totalCurr;
      const changeVal = currVal - prevVal;
      const trendVal = prevVal === 0 ? (currVal > 0 ? 1 : 0) : changeVal / prevVal;

      dataRow.getCell(1).value = spvr.name;
      dataRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

      dataRow.getCell(2).value = prevVal;
      dataRow.getCell(2).numFmt = '#,##0.00';
      dataRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };

      dataRow.getCell(3).value = currVal;
      dataRow.getCell(3).numFmt = '#,##0.00';
      dataRow.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };

      const changeCell = dataRow.getCell(4);
      changeCell.value = { formula: `C${currentRow}-B${currentRow}`, result: changeVal };
      changeCell.numFmt = '#,##0.00';
      changeCell.alignment = { horizontal: 'right', vertical: 'middle' };
      if (changeVal < 0) {
        changeCell.font = { color: { argb: 'FFFF0000' } };
      } else if (changeVal > 0) {
        changeCell.font = { color: { argb: 'FF00B050' } };
      }

      const trendCell = dataRow.getCell(5);
      trendCell.value = {
        formula: `IF(B${currentRow}=0, IF(C${currentRow}>0, 1, 0), (C${currentRow}-B${currentRow})/B${currentRow})`,
        result: trendVal
      };
      trendCell.numFmt = '0.00%';
      trendCell.alignment = { horizontal: 'right', vertical: 'middle' };
      if (trendVal < 0) {
        trendCell.font = { color: { argb: 'FFFF0000' } };
      } else if (trendVal > 0) {
        trendCell.font = { color: { argb: 'FF00B050' } };
      }

      for (let col = 1; col <= numCols; col++) {
        dataRow.getCell(col).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }

      currentRow++;
    });

    const dataEndRow = currentRow - 1;

    // 4. TOTAL Row
    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(1).value = 'TOTAL';
    totalRow.getCell(1).font = { name: 'Calibri', size: 11, bold: true };
    totalRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    let areaTotalPrev = spvrList.reduce((acc, s) => acc + s.totalPrev, 0);
    let areaTotalCurr = spvrList.reduce((acc, s) => acc + s.totalCurr, 0);
    let areaTotalChange = areaTotalCurr - areaTotalPrev;
    let areaTotalTrend = areaTotalPrev === 0 ? (areaTotalCurr > 0 ? 1 : 0) : areaTotalChange / areaTotalPrev;

    totalRow.getCell(2).value = { formula: `SUM(B${dataStartRow}:B${dataEndRow})`, result: areaTotalPrev };
    totalRow.getCell(2).font = { name: 'Calibri', size: 11, bold: true };
    totalRow.getCell(2).numFmt = '#,##0.00';
    totalRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };

    totalRow.getCell(3).value = { formula: `SUM(C${dataStartRow}:C${dataEndRow})`, result: areaTotalCurr };
    totalRow.getCell(3).font = { name: 'Calibri', size: 11, bold: true };
    totalRow.getCell(3).numFmt = '#,##0.00';
    totalRow.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };

    const totalChangeCell = totalRow.getCell(4);
    totalChangeCell.value = { formula: `SUM(D${dataStartRow}:D${dataEndRow})`, result: areaTotalChange };
    totalChangeCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: areaTotalChange < 0 ? 'FFFF0000' : 'FF00B050' } };
    totalChangeCell.numFmt = '#,##0.00';
    totalChangeCell.alignment = { horizontal: 'right', vertical: 'middle' };

    const totalTrendCell = totalRow.getCell(5);
    totalTrendCell.value = {
      formula: `IF(B${currentRow}=0, IF(C${currentRow}>0, 1, 0), (C${currentRow}-B${currentRow})/B${currentRow})`,
      result: areaTotalTrend
    };
    totalTrendCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: areaTotalTrend < 0 ? 'FFFF0000' : 'FF00B050' } };
    totalTrendCell.numFmt = '0.00%';
    totalTrendCell.alignment = { horizontal: 'right', vertical: 'middle' };

    for (let col = 1; col <= numCols; col++) {
      totalRow.getCell(col).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    }

    currentRow += 2; // Separate areas with blank rows
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const sanitizedDate = overallDateLabel.replace(/ - /g, '-').replace(/ /g, '_');
  saveAs(blob, `${regionName.replace(/ /g, '_')}_Weekly_Analysis_${sanitizedDate}.xlsx`);
};

export const generateMonthlyAnalysisExcelReport = async ({
  apiData,
  selectedEndDate,
  regionName = 'MAG',
  currentPage = 'mag'
}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Monthly Analysis');

  let refDate = selectedEndDate ? new Date(selectedEndDate) : new Date();
  if (isNaN(refDate.getTime())) refDate = new Date();

  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth() + 1;

  let prevDate = new Date(refDate);
  prevDate.setMonth(refDate.getMonth() - 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth() + 1;

  const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
  const getMonthShortName = (m) => new Date(2000, m - 1, 1).toLocaleString('default', { month: 'short' });

  const prevMonthStr = getMonthShortName(prevMonth);
  const prevDateLabel = `${prevMonthStr}1 - ${prevMonthStr}${getDaysInMonth(prevYear, prevMonth)}`;

  const currMonthStr = getMonthShortName(currentMonth);
  const currDateLabel = `${currMonthStr}1 - ${currMonthStr}${getDaysInMonth(currentYear, currentMonth)}`;

  const rawData = apiData?.data || [];
  const spvrMap = {};
  if (Array.isArray(apiData?.supervisors)) {
    apiData.supervisors.forEach(s => {
      spvrMap[s.id] = s.username?.toUpperCase() || s.fullName;
    });
  }

  const classifyArea = (spvrName) => {
    const nameStr = String(spvrName || '');
    const nameLower = nameStr.toLowerCase();

    if (nameLower.includes('parang')) return 'PARANG';
    if (nameLower.includes('southupi') || nameLower.includes('south upi') || nameLower.includes('south-upi')) return 'SOUTH UPI';
    if (nameLower.includes('dos') || nameLower.includes('awang') || nameLower.includes('dalican')) return 'AWANG';
    if (nameLower.includes('nkabuntalan') || nameLower.includes('north kabuntalan') || nameLower.includes('kabuntalan')) return 'NORTH KABUNTALAN';
    if (nameLower.includes('upi') || nameLower.includes('dbs')) return 'NORTH UPI';
    
    if (currentPage === 'mag' || regionName === 'MAG' || regionName === 'MAGUINDANAO' || regionName === 'IMPERIAL') {
      return 'MAG SUR';
    }
    return regionName || 'GENERAL AREA';
  };

  const areaGroups = {};

  // Initialize supervisor map
  if (Array.isArray(apiData?.supervisors)) {
    apiData.supervisors.forEach(s => {
      const spvrName = s.username?.toUpperCase() || s.fullName;
      if (!spvrName) return;
      const areaName = classifyArea(spvrName);
      if (!areaGroups[areaName]) areaGroups[areaName] = {};
      if (!areaGroups[areaName][spvrName]) {
        areaGroups[areaName][spvrName] = { name: spvrName, prev: 0, curr: 0 };
      }
    });
  }

  rawData.forEach(item => {
    const amount = item.TotalOverAllGross || 0;
    const spvrName = spvrMap[item.supervisor] || item.location || 'UNKNOWN AREA';
    const areaName = classifyArea(spvrName);

    if (!areaGroups[areaName]) {
      areaGroups[areaName] = {};
    }
    if (!areaGroups[areaName][spvrName]) {
      areaGroups[areaName][spvrName] = { name: spvrName, prev: 0, curr: 0 };
    }

    if (item.drawYear === currentYear && item.drawMonth === currentMonth) {
      areaGroups[areaName][spvrName].curr += amount;
    } else if (item.drawYear === prevYear && item.drawMonth === prevMonth) {
      areaGroups[areaName][spvrName].prev += amount;
    }
  });

  const defaultAreaOrder = ['MAG SUR', 'PARANG', 'AWANG', 'SOUTH UPI', 'NORTH KABUNTALAN', 'NORTH UPI'];
  const presentAreas = Object.keys(areaGroups);

  const sortedAreas = presentAreas.sort((a, b) => {
    const indexA = defaultAreaOrder.indexOf(a);
    const indexB = defaultAreaOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  worksheet.columns = [
    { key: 'spvr', width: 35 },
    { key: 'prev', width: 25 },
    { key: 'curr', width: 25 },
    { key: 'change', width: 18 },
    { key: 'trend', width: 15 }
  ];

  let currentRow = 1;

  sortedAreas.forEach(areaName => {
    const spvrList = Object.values(areaGroups[areaName])
      .filter(s => s.prev > 0 || s.curr > 0)
      .sort((a, b) => b.curr - a.curr);

    if (spvrList.length === 0) return;

    // 1. Area Header Row (Light Green)
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const areaHeaderCell = worksheet.getCell(`A${currentRow}`);
    areaHeaderCell.value = areaName;
    areaHeaderCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
    areaHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };

    for (let col = 1; col <= 5; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6E0B4' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    }
    currentRow++;

    // 2. Table Column Header Row (Dark Navy)
    const headerRow = worksheet.getRow(currentRow);
    headerRow.values = [
      'SPVR',
      `Previous (${prevDateLabel})`,
      `Current (${currDateLabel})`,
      'Change',
      'Trend %'
    ];

    headerRow.eachCell((cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: colNumber === 1 ? 'left' : 'right', vertical: 'middle' };
      if (colNumber === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    currentRow++;

    const dataStartRow = currentRow;

    // 3. Data Rows
    spvrList.forEach(spvr => {
      const dataRow = worksheet.getRow(currentRow);
      const prevVal = spvr.prev;
      const currVal = spvr.curr;
      const changeVal = currVal - prevVal;
      const trendVal = prevVal === 0 ? (currVal > 0 ? 1 : 0) : changeVal / prevVal;

      dataRow.getCell(1).value = spvr.name;
      dataRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

      dataRow.getCell(2).value = prevVal;
      dataRow.getCell(2).numFmt = '#,##0.00';
      dataRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };

      dataRow.getCell(3).value = currVal;
      dataRow.getCell(3).numFmt = '#,##0.00';
      dataRow.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };

      const changeCell = dataRow.getCell(4);
      changeCell.value = { formula: `C${currentRow}-B${currentRow}`, result: changeVal };
      changeCell.numFmt = '#,##0.00';
      changeCell.alignment = { horizontal: 'right', vertical: 'middle' };
      if (changeVal < 0) {
        changeCell.font = { color: { argb: 'FFFF0000' } };
      } else if (changeVal > 0) {
        changeCell.font = { color: { argb: 'FF00B050' } };
      }

      const trendCell = dataRow.getCell(5);
      trendCell.value = {
        formula: `IF(B${currentRow}=0, IF(C${currentRow}>0, 1, 0), (C${currentRow}-B${currentRow})/B${currentRow})`,
        result: trendVal
      };
      trendCell.numFmt = '0.00%';
      trendCell.alignment = { horizontal: 'right', vertical: 'middle' };
      if (trendVal < 0) {
        trendCell.font = { color: { argb: 'FFFF0000' } };
      } else if (trendVal > 0) {
        trendCell.font = { color: { argb: 'FF00B050' } };
      }

      for (let col = 1; col <= 5; col++) {
        dataRow.getCell(col).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }

      currentRow++;
    });

    const dataEndRow = currentRow - 1;

    // 4. TOTAL Row
    const totalRow = worksheet.getRow(currentRow);

    totalRow.getCell(1).value = 'TOTAL';
    totalRow.getCell(1).font = { name: 'Calibri', size: 11, bold: true };
    totalRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    let areaTotalPrev = 0;
    let areaTotalCurr = 0;
    spvrList.forEach(s => {
      areaTotalPrev += s.prev;
      areaTotalCurr += s.curr;
    });
    const areaTotalChange = areaTotalCurr - areaTotalPrev;
    const areaTotalTrend = areaTotalPrev === 0 ? (areaTotalCurr > 0 ? 1 : 0) : areaTotalChange / areaTotalPrev;

    totalRow.getCell(2).value = { formula: `SUM(B${dataStartRow}:B${dataEndRow})`, result: areaTotalPrev };
    totalRow.getCell(2).font = { name: 'Calibri', size: 11, bold: true };
    totalRow.getCell(2).numFmt = '#,##0.00';
    totalRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };

    totalRow.getCell(3).value = { formula: `SUM(C${dataStartRow}:C${dataEndRow})`, result: areaTotalCurr };
    totalRow.getCell(3).font = { name: 'Calibri', size: 11, bold: true };
    totalRow.getCell(3).numFmt = '#,##0.00';
    totalRow.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };

    const totalChangeCell = totalRow.getCell(4);
    totalChangeCell.value = { formula: `SUM(D${dataStartRow}:D${dataEndRow})`, result: areaTotalChange };
    totalChangeCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: areaTotalChange < 0 ? 'FFFF0000' : 'FF00B050' } };
    totalChangeCell.numFmt = '#,##0.00';
    totalChangeCell.alignment = { horizontal: 'right', vertical: 'middle' };

    const totalTrendCell = totalRow.getCell(5);
    totalTrendCell.value = {
      formula: `IF(B${currentRow}=0, IF(C${currentRow}>0, 1, 0), (C${currentRow}-B${currentRow})/B${currentRow})`,
      result: areaTotalTrend
    };
    totalTrendCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: areaTotalTrend < 0 ? 'FFFF0000' : 'FF00B050' } };
    totalTrendCell.numFmt = '0.00%';
    totalTrendCell.alignment = { horizontal: 'right', vertical: 'middle' };

    for (let col = 1; col <= 5; col++) {
      totalRow.getCell(col).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    }

    currentRow += 2; // Separate tables with blank row
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${regionName.replace(/ /g, '_')}_Monthly_Analysis.xlsx`);
};

