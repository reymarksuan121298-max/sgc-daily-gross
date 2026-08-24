import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export async function exportManCommissionExcel(groupsData, selectedDate) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('MAN Commission');

  const d = new Date(selectedDate);
  const monthShort = d.toLocaleString('default', { month: 'short' });
  const dayStr = d.getDate();
  const dateLabel = `${monthShort}${dayStr}`;

  // Column definitions with spacing columns
  worksheet.columns = [
    { key: 'col1_name', width: 28 },
    { key: 'col1_gross', width: 14 },
    { key: 'gap1', width: 4 },
    { key: 'col2_name', width: 28 },
    { key: 'col2_gross', width: 14 },
    { key: 'gap2', width: 4 },
    { key: 'col3_name', width: 28 },
    { key: 'col3_gross', width: 14 },
    { key: 'gap3', width: 4 },
    { key: 'col4_name', width: 28 },
    { key: 'col4_gross', width: 14 }
  ];

  // Helper to style cells
  const borderThin = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
  };

  const writeTable = (startRow, startCol, group) => {
    // Row 1: Title
    const titleCell1 = worksheet.getCell(startRow, startCol);
    const titleCell2 = worksheet.getCell(startRow, startCol + 1);
    worksheet.mergeCells(startRow, startCol, startRow, startCol + 1);
    titleCell1.value = group.title;
    titleCell1.font = { bold: true, size: 10, name: 'Calibri' };
    titleCell1.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell1.border = borderThin;
    titleCell2.border = borderThin;

    // Row 2: Date Header
    const dateLabelCell = worksheet.getCell(startRow + 1, startCol);
    const dateValCell = worksheet.getCell(startRow + 1, startCol + 1);
    dateLabelCell.value = 'Date';
    dateLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } }; // Cyan
    dateLabelCell.font = { bold: true, size: 10, name: 'Calibri' };
    dateLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    dateLabelCell.border = borderThin;

    dateValCell.value = dateLabel;
    dateValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } }; // Cyan
    dateValCell.font = { bold: true, size: 10, name: 'Calibri' };
    dateValCell.alignment = { horizontal: 'center', vertical: 'middle' };
    dateValCell.border = borderThin;

    // Row 3: Teller | Gross Header
    const tellerHCell = worksheet.getCell(startRow + 2, startCol);
    const grossHCell = worksheet.getCell(startRow + 2, startCol + 1);
    tellerHCell.value = 'Teller';
    tellerHCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } }; // Cyan
    tellerHCell.font = { bold: true, size: 10, name: 'Calibri' };
    tellerHCell.alignment = { horizontal: 'center', vertical: 'middle' };
    tellerHCell.border = borderThin;

    grossHCell.value = 'Gross';
    grossHCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } }; // Red
    grossHCell.font = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FFFFFFFF' } }; // White on Red
    grossHCell.alignment = { horizontal: 'center', vertical: 'middle' };
    grossHCell.border = borderThin;

    // Teller Data Rows (Exclude 0 amount)
    let currentRow = startRow + 3;
    let groupTotal = 0;

    const nonZeroTellers = (group.tellers || []).filter((t) => Number(t.gross) > 0);

    nonZeroTellers.forEach((t) => {
      const nameCell = worksheet.getCell(currentRow, startCol);
      const grossCell = worksheet.getCell(currentRow, startCol + 1);

      nameCell.value = t.name;
      nameCell.font = { size: 9, name: 'Calibri' };
      nameCell.alignment = { horizontal: 'left', vertical: 'middle' };
      nameCell.border = borderThin;

      grossCell.value = Number(t.gross);
      grossCell.numFmt = '#,##0';
      grossCell.font = { size: 9, name: 'Calibri' };
      grossCell.alignment = { horizontal: 'right', vertical: 'middle' };
      grossCell.border = borderThin;

      groupTotal += Number(t.gross) || 0;
      currentRow++;
    });

    // Total Row
    const totalLabelCell = worksheet.getCell(currentRow, startCol);
    const totalValCell = worksheet.getCell(currentRow, startCol + 1);

    totalLabelCell.value = 'TOAL';
    totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1D2' } }; // Light Green / Olive
    totalLabelCell.font = { bold: true, size: 10, name: 'Calibri' };
    totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalLabelCell.border = borderThin;

    totalValCell.value = groupTotal;
    totalValCell.numFmt = '#,##0';
    totalValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1D2' } }; // Light Green / Olive
    totalValCell.font = { bold: true, size: 10, name: 'Calibri' };
    totalValCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalValCell.border = borderThin;

    return currentRow + 2; // return next start row with 1 empty row gap
  };

  // Find groups
  const findGroup = (id) => groupsData.find((g) => g.id === id) || { id, title: id, tellers: [] };

  // Column 1 (Cols A-B, 1-2): RWS, then COORDINATOR: LONGWIND
  let c1Row = 1;
  c1Row = writeTable(c1Row, 1, findGroup('rws'));
  writeTable(c1Row, 1, findGroup('longwind'));

  // Column 2 (Cols D-E, 4-5): PNP COMMISION, then COORDINATOR: KAPITAN, then SPVR-APPLE
  let c2Row = 1;
  c2Row = writeTable(c2Row, 4, findGroup('pnp_commission'));
  c2Row = writeTable(c2Row, 4, findGroup('kapitan'));
  writeTable(c2Row, 4, findGroup('spvr_apple'));

  // Column 3 (Cols G-H, 7-8): GROUP C, GROUP D, GROUP G, GROUP EDIK
  let c3Row = 1;
  c3Row = writeTable(c3Row, 7, findGroup('group_c'));
  c3Row = writeTable(c3Row, 7, findGroup('group_d'));
  c3Row = writeTable(c3Row, 7, findGroup('group_g'));
  writeTable(c3Row, 7, findGroup('group_edik'));

  // Column 4 (Cols J-K, 10-11): SPVR-MOLLY
  writeTable(1, 10, findGroup('spvr_molly'));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `MAN_Commission_${selectedDate}.xlsx`);
}
