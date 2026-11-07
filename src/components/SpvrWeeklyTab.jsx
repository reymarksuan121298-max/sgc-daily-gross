import React, { useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { generateSpvrWeeklyExcelReport } from '../utils/exportToExcel';

const DEFAULT_NORTE_AREAS = ['PARANG', 'AWANG', 'SOUTH UPI', 'NORTH KABUNTALAN', 'NORTH UPI'];

const NORTE_AREA_LABELS = {
  'PARANG': 'PARANG',
  'AWANG': 'AWANG / DOS / DALICAN',
  'SOUTH UPI': 'SOUTH UPI',
  'NORTH KABUNTALAN': 'NORTH KABUNTALAN',
  'NORTH UPI': 'NORTH UPI / DATUPIANG / DBS'
};

const classifyMagArea = (spvrName) => {
  const nameStr = String(spvrName || '');
  const nameLower = nameStr.toLowerCase();

  if (nameLower.includes('parang')) return 'PARANG';
  if (nameLower.includes('southupi') || nameLower.includes('south upi') || nameLower.includes('south-upi')) return 'SOUTH UPI';
  if (nameLower.includes('dos') || nameLower.includes('awang') || nameLower.includes('dalican')) return 'AWANG';
  if (nameLower.includes('nkabuntalan') || nameLower.includes('north kabuntalan') || nameLower.includes('kabuntalan')) return 'NORTH KABUNTALAN';
  if (nameLower.includes('upi') || nameLower.includes('dbs') || nameLower.includes('datupiang') || nameLower.includes('datu piang')) return 'NORTH UPI';
  
  return 'MAG SUR';
};

export default function SpvrWeeklyTab({ apiData, currentPage }) {
  const [copiedKey, setCopiedKey] = useState('');
  const [magFilter, setMagFilter] = useState('all'); // 'all', 'magsur', 'magnorte'

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

  const getShortDateRange = (dateList) => {
    if (!dateList || dateList.length === 0) return '';
    const getLabel = (isoStr) => {
      if (!isoStr) return '';
      const [y, m, d] = isoStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const month = dateObj.toLocaleString('en-US', { month: 'short' });
      return `${month}${d}`;
    };
    return `${getLabel(dateList[0])} - ${getLabel(dateList[dateList.length - 1])}`;
  };

  const currDateLabel = getShortDateRange(current7Dates);
  const prevDateLabel = getShortDateRange(previous7Dates);

  // Maguindanao Regional Separations (MAG SUR & MAG NORTE)
  const isMag = currentPage === 'mag';

  const magSurData = isMag
    ? spvrData
        .filter(s => classifyMagArea(s.name) === 'MAG SUR')
        .sort((a, b) => b.current - a.current)
    : [];

  const magNorteByArea = {};
  if (isMag) {
    DEFAULT_NORTE_AREAS.forEach(area => { magNorteByArea[area] = []; });
    spvrData.forEach(s => {
      const area = classifyMagArea(s.name);
      if (area !== 'MAG SUR' && magNorteByArea[area]) {
        magNorteByArea[area].push(s);
      }
    });
    DEFAULT_NORTE_AREAS.forEach(area => {
      magNorteByArea[area].sort((a, b) => b.current - a.current);
    });
  }

  const magNorteData = [];
  if (isMag) {
    DEFAULT_NORTE_AREAS.forEach(area => {
      if (magNorteByArea[area]) {
        magNorteData.push(...magNorteByArea[area]);
      }
    });
  }

  // Copy rows with blank lines between groups for Image 2 spreadsheet compatibility
  const magNorteCopyRows = [];
  if (isMag) {
    DEFAULT_NORTE_AREAS.forEach((area, index) => {
      const items = magNorteByArea[area] || [];
      if (items.length > 0) {
        if (index > 0 && magNorteCopyRows.length > 0) {
          magNorteCopyRows.push(null); // blank row separator between areas matching user's spreadsheet template
        }
        magNorteCopyRows.push(...items);
      }
    });
  }

  // Generic Clipboard Copy Function with Navy Blue (#1f497d) & Arial 12 Header
  const copyColumnToClipboard = async (rowsWithBlanks, keyName) => {
    if (!rowsWithBlanks || rowsWithBlanks.length === 0) return;

    const headerLine = currDateLabel || 'TOTAL CURRENT (7D)';
    
    // Plain text format
    const plainRows = rowsWithBlanks.map(r => {
      if (r === null) return '';
      return (r.current || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    });
    const copyText = `${headerLine}\n${plainRows.join('\n')}`;

    // Rich HTML format for Excel and Google Sheets (Defaulting entire copy text to Arial 12pt)
    const rowsHtml = rowsWithBlanks.map(r => {
      if (r === null) {
        return '<tr><td style="font-family: Arial, sans-serif; font-size: 12pt; border: 1px solid #d9d9d9; padding: 4px 8px;">&nbsp;</td></tr>';
      }
      const valStr = (r.current || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `<tr><td style="text-align: right; font-family: Arial, sans-serif; font-size: 12pt; mso-number-format:'#,##0.00'; padding: 4px 8px; border: 1px solid #d9d9d9;">${valStr}</td></tr>`;
    }).join('');

    const htmlTable = `<table style="font-family: Arial, sans-serif; font-size: 12pt;"><thead><tr><th style="background-color: #1f497d; color: #ffffff; font-weight: bold; font-family: Arial, sans-serif; font-size: 12pt; text-align: center; padding: 6px 12px; border: 1px solid #1f497d;">${headerLine}</th></tr></thead><tbody style="font-family: Arial, sans-serif; font-size: 12pt;">${rowsHtml}</tbody></table>`;

    try {
      if (typeof ClipboardItem !== 'undefined' && navigator?.clipboard?.write) {
        const htmlBlob = new Blob([htmlTable], { type: 'text/html' });
        const textBlob = new Blob([copyText], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob
          })
        ]);
      } else {
        const listener = (e) => {
          e.preventDefault();
          if (e.clipboardData) {
            e.clipboardData.setData('text/html', htmlTable);
            e.clipboardData.setData('text/plain', copyText);
          }
        };
        document.addEventListener('copy', listener);
        document.execCommand('copy');
        document.removeEventListener('copy', listener);
      }
      setCopiedKey(keyName);
      setTimeout(() => setCopiedKey(''), 2000);
    } catch (err) {
      console.warn('Clipboard write failed, attempting text fallback', err);
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(copyText);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = copyText;
          textArea.style.position = 'fixed';
          textArea.style.left = '-9999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
        setCopiedKey(keyName);
        setTimeout(() => setCopiedKey(''), 2000);
      } catch (fallbackErr) {
        console.error('Failed to copy to clipboard', fallbackErr);
      }
    }
  };

  const handleCopyCurrent7D = () => copyColumnToClipboard(spvrData, 'all');
  const handleCopyMagSur = () => copyColumnToClipboard(magSurData, 'magsur');
  const handleCopyMagNorte = () => copyColumnToClipboard(magNorteCopyRows, 'magnorte');

  const handleDownload = async (targetRegion = null) => {
    let sourceData = spvrData;
    let exportRegion = currentPage === 'man' ? 'MAN' : currentPage === 'imp' ? 'IMPERIAL' : currentPage === 'setb' ? 'SETB' : currentPage === 'iligan' ? 'ILIGAN' : currentPage === 'lanao' ? 'LANAO' : currentPage === 'lotto' ? 'LOTTO' : currentPage === 'baloi' ? 'BALOI' : currentPage === 'lds' ? 'LDS' : 'MAG';

    if (isMag && targetRegion === 'magsur') {
      sourceData = magSurData;
      exportRegion = 'MAG SUR';
    } else if (isMag && targetRegion === 'magnorte') {
      sourceData = magNorteData;
      exportRegion = 'MAG NORTE';
    }

    const excelData = sourceData.map(spvr => {
      const daily = {};
      current7Dates.forEach((d, i) => daily[d] = spvr.days[i]);
      return {
        name: spvr.name,
        daily: daily,
        totalCurr: spvr.current,
        totalPrev: spvr.previous,
        difference: spvr.shift
      };
    });

    await generateSpvrWeeklyExcelReport(excelData, current7Dates, previous7Dates, exportRegion, currentPage);
  };

  // Helper row renderer
  const renderRow = (row, i) => (
    <tr key={i} className="hover:bg-surface-hover transition-colors">
      <td className="py-5 px-8 text-xs font-extrabold text-textPrimary tracking-wide">{row.name}</td>
      {row.days.map((val, dIdx) => (
        <td key={dIdx} className="py-5 px-4 text-[11px] text-textSecondary text-center font-bold">₱{val?.toLocaleString()}</td>
      ))}
      <td className="py-5 px-6 text-[13px] text-textPrimary text-center font-extrabold bg-[#1f497d]/10 border-l border-border-divider">₱{row.current?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
      <td className="py-5 px-6 text-[13px] text-textSecondary text-center font-semibold bg-surface-header/30">₱{row.previous?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
      <td className="py-5 px-8 text-[13px] text-right bg-surface-header/30">
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
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Region Sub-Tabs for MAG */}
        {isMag ? (
          <div className="flex items-center gap-1.5 p-1 glass-card rounded-xl border border-border-divider/50 shadow-sm">
            <button
              onClick={() => setMagFilter('all')}
              className={clsx(
                "px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
                magFilter === 'all'
                  ? "bg-[#1f497d] text-white shadow-md shadow-[#1f497d]/30"
                  : "text-textSecondary hover:text-textPrimary hover:bg-surface-hover"
              )}
            >
              <span>ALL MAGUINDANAO</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white/90">{spvrData.length}</span>
            </button>
            <button
              onClick={() => setMagFilter('magsur')}
              className={clsx(
                "px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
                magFilter === 'magsur'
                  ? "bg-[#1f497d] text-white shadow-md shadow-[#1f497d]/30"
                  : "text-textSecondary hover:text-textPrimary hover:bg-surface-hover"
              )}
            >
              <span>MAG SUR</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white/90">{magSurData.length}</span>
            </button>
            <button
              onClick={() => setMagFilter('magnorte')}
              className={clsx(
                "px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
                magFilter === 'magnorte'
                  ? "bg-[#1f497d] text-white shadow-md shadow-[#1f497d]/30"
                  : "text-textSecondary hover:text-textPrimary hover:bg-surface-hover"
              )}
            >
              <span>MAG NORTE</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white/90">{magNorteData.length}</span>
            </button>
          </div>
        ) : (
          <div />
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 ml-auto">
          {/* Mag Sur Copy Button */}
          {isMag && (magFilter === 'magsur' || magFilter === 'all') && (
            <button 
              onClick={handleCopyMagSur}
              disabled={magSurData.length === 0}
              className={clsx(
                "flex items-center gap-2 font-semibold px-4 py-2.5 rounded-lg transition-all text-sm shadow-md",
                copiedKey === 'magsur'
                  ? "bg-emerald-600 text-white shadow-emerald-600/30"
                  : "glass-card text-textPrimary hover:bg-surface-hover border border-border-divider/50 hover:border-[#1f497d] cursor-pointer"
              )}
              title={`Copy MAG SUR column with navy blue header (${currDateLabel || '7D'}) for spreadsheet (Image 1)`}
            >
              {copiedKey === 'magsur' ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Copied MAG SUR!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-accentGreen" />
                  <span>Copy MAG SUR</span>
                  <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }} className="px-2 py-0.5 rounded bg-[#1f497d] text-white font-bold shadow-sm">
                    {currDateLabel || '7D'}
                  </span>
                </>
              )}
            </button>
          )}

          {/* Mag Norte Copy Button */}
          {isMag && (magFilter === 'magnorte' || magFilter === 'all') && (
            <button 
              onClick={handleCopyMagNorte}
              disabled={magNorteData.length === 0}
              className={clsx(
                "flex items-center gap-2 font-semibold px-4 py-2.5 rounded-lg transition-all text-sm shadow-md",
                copiedKey === 'magnorte'
                  ? "bg-emerald-600 text-white shadow-emerald-600/30"
                  : "glass-card text-textPrimary hover:bg-surface-hover border border-border-divider/50 hover:border-[#1f497d] cursor-pointer"
              )}
              title={`Copy MAG NORTE column with area separators and navy blue header (${currDateLabel || '7D'}) for spreadsheet (Image 2)`}
            >
              {copiedKey === 'magnorte' ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Copied MAG NORTE!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-accentGreen" />
                  <span>Copy MAG NORTE</span>
                  <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }} className="px-2 py-0.5 rounded bg-[#1f497d] text-white font-bold shadow-sm">
                    {currDateLabel || '7D'}
                  </span>
                </>
              )}
            </button>
          )}

          {/* Non-Mag Copy Button */}
          {!isMag && (
            <button 
              onClick={handleCopyCurrent7D}
              disabled={spvrData.length === 0}
              className={clsx(
                "flex items-center gap-2 font-semibold px-4 py-2.5 rounded-lg transition-all text-sm shadow-md",
                copiedKey === 'all'
                  ? "bg-emerald-600 text-white shadow-emerald-600/30"
                  : "glass-card text-textPrimary hover:bg-surface-hover border border-border-divider/50 hover:border-[#1f497d] cursor-pointer"
              )}
              title={`Copy column with navy blue header (${currDateLabel || '7D'}) for spreadsheet`}
            >
              {copiedKey === 'all' ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Copied ${currDateLabel || '7D'}!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-accentGreen" />
                  <span>Copy</span>
                  <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }} className="px-2 py-0.5 rounded bg-[#1f497d] text-white font-bold shadow-sm">
                    {currDateLabel || 'Current 7D'}
                  </span>
                </>
              )}
            </button>
          )}

          {/* Download Button */}
          <button 
            onClick={() => handleDownload(magFilter)}
            className="flex items-center gap-2 bg-white hover:bg-slate-200 text-slate-900 font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)] text-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Analysis
          </button>
        </div>
      </div>

      {/* SECTION 1: MAG SUR TABLE (when magFilter === 'magsur' or 'all') */}
      {isMag && (magFilter === 'magsur' || magFilter === 'all') && (
        <div className="bg-surface rounded-3xl border border-border-divider shadow-xl overflow-hidden mt-6">
          <div className="px-8 py-5 border-b border-border-divider flex flex-wrap justify-between items-center bg-surface gap-3">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-[#1f497d] text-white shadow-sm">
                MAG SUR
              </span>
              <h3 className="text-[15px] font-extrabold tracking-wide text-textPrimary">
                SUPERVISORS WEEKLY ({magSurData.length})
              </h3>
            </div>
            <button
              onClick={handleCopyMagSur}
              disabled={magSurData.length === 0}
              className={clsx(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                copiedKey === 'magsur'
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30"
                  : "bg-[#1f497d]/20 hover:bg-[#1f497d] text-blue-200 hover:text-white border-[#1f497d]/50"
              )}
              title="Copy MAG SUR column formatted for Image 1 spreadsheet"
            >
              {copiedKey === 'magsur' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'magsur' ? 'Copied MAG SUR!' : 'Copy MAG SUR'}</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-surface border-b border-border-divider">
                  <th className="py-5 px-8 font-extrabold text-[10px] text-textSecondary uppercase tracking-widest">SPVR IDENTITY</th>
                  {dates.map((date, i) => (
                    <th key={i} className="py-5 px-4 font-extrabold text-[10px] text-textSecondary uppercase tracking-widest text-center">{date}</th>
                  ))}
                  <th className="py-4 px-6 font-extrabold text-[10px] uppercase tracking-widest text-center bg-[#1f497d]/20 border-l border-border-divider">
                    <div className="flex items-center justify-center gap-1.5">
                      <div>
                        <span className="text-textSecondary text-[10px] font-extrabold uppercase">TOTAL CURRENT</span><br/>
                        <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }} className="inline-block mt-0.5 px-2.5 py-0.5 rounded bg-[#1f497d] text-white font-bold tracking-normal shadow-sm">
                          {currDateLabel || '7D'}
                        </span>
                      </div>
                      <button
                        onClick={handleCopyMagSur}
                        disabled={magSurData.length === 0}
                        className={clsx(
                          "p-1.5 rounded-md transition-all hover:scale-105 cursor-pointer ml-0.5",
                          copiedKey === 'magsur'
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-[#1f497d]/40 hover:bg-[#1f497d] text-white border border-[#1f497d]/60 shadow-sm"
                        )}
                        title="Copy MAG SUR column"
                      >
                        {copiedKey === 'magsur' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </th>
                  <th className="py-5 px-6 font-extrabold text-[10px] text-textSecondary uppercase tracking-widest text-center bg-surface-header">
                    TOTAL PREVIOUS<br/><span className="text-[9px] text-textSecondary">{prevDateLabel ? `(${prevDateLabel})` : '(7D)'}</span>
                  </th>
                  <th className="py-5 px-8 font-extrabold text-[10px] text-textSecondary uppercase tracking-widest text-right bg-surface-header">SHIFT ANALYSIS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-divider bg-surface">
                {magSurData.map(renderRow)}
                {magSurData.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-textSecondary text-sm font-semibold">No MAG SUR supervisors found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: MAG NORTE TABLE (when magFilter === 'magnorte' or 'all') */}
      {isMag && (magFilter === 'magnorte' || magFilter === 'all') && (
        <div className="bg-surface rounded-3xl border border-border-divider shadow-xl overflow-hidden mt-6">
          <div className="px-8 py-5 border-b border-border-divider flex flex-wrap justify-between items-center bg-surface gap-3">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-indigo-700 text-white shadow-sm">
                MAG NORTE
              </span>
              <h3 className="text-[15px] font-extrabold tracking-wide text-textPrimary">
                SUPERVISORS WEEKLY ({magNorteData.length})
              </h3>
            </div>
            <button
              onClick={handleCopyMagNorte}
              disabled={magNorteData.length === 0}
              className={clsx(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                copiedKey === 'magnorte'
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30"
                  : "bg-[#1f497d]/20 hover:bg-[#1f497d] text-blue-200 hover:text-white border-[#1f497d]/50"
              )}
              title="Copy MAG NORTE column formatted with area separators for Image 2 spreadsheet"
            >
              {copiedKey === 'magnorte' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'magnorte' ? 'Copied MAG NORTE!' : 'Copy MAG NORTE'}</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-surface border-b border-border-divider">
                  <th className="py-5 px-8 font-extrabold text-[10px] text-textSecondary uppercase tracking-widest">SPVR IDENTITY</th>
                  {dates.map((date, i) => (
                    <th key={i} className="py-5 px-4 font-extrabold text-[10px] text-textSecondary uppercase tracking-widest text-center">{date}</th>
                  ))}
                  <th className="py-4 px-6 font-extrabold text-[10px] uppercase tracking-widest text-center bg-[#1f497d]/20 border-l border-border-divider">
                    <div className="flex items-center justify-center gap-1.5">
                      <div>
                        <span className="text-textSecondary text-[10px] font-extrabold uppercase">TOTAL CURRENT</span><br/>
                        <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }} className="inline-block mt-0.5 px-2.5 py-0.5 rounded bg-[#1f497d] text-white font-bold tracking-normal shadow-sm">
                          {currDateLabel || '7D'}
                        </span>
                      </div>
                      <button
                        onClick={handleCopyMagNorte}
                        disabled={magNorteData.length === 0}
                        className={clsx(
                          "p-1.5 rounded-md transition-all hover:scale-105 cursor-pointer ml-0.5",
                          copiedKey === 'magnorte'
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-[#1f497d]/40 hover:bg-[#1f497d] text-white border border-[#1f497d]/60 shadow-sm"
                        )}
                        title="Copy MAG NORTE column"
                      >
                        {copiedKey === 'magnorte' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </th>
                  <th className="py-5 px-6 font-extrabold text-[10px] text-textSecondary uppercase tracking-widest text-center bg-surface-header">
                    TOTAL PREVIOUS<br/><span className="text-[9px] text-textSecondary">{prevDateLabel ? `(${prevDateLabel})` : '(7D)'}</span>
                  </th>
                  <th className="py-5 px-8 font-extrabold text-[10px] text-textSecondary uppercase tracking-widest text-right bg-surface-header">SHIFT ANALYSIS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-divider bg-surface">
                {DEFAULT_NORTE_AREAS.map((areaKey) => {
                  const areaRows = magNorteByArea[areaKey] || [];
                  if (areaRows.length === 0) return null;
                  return (
                    <React.Fragment key={areaKey}>
                      <tr className="bg-surface-header/60 border-t-2 border-b border-border-divider">
                        <td colSpan={dates.length + 4} className="py-3 px-8 text-xs font-black tracking-widest uppercase text-blue-300">
                          <span className="inline-block px-2.5 py-1 rounded bg-[#1f497d]/50 border border-[#1f497d]/80 mr-2.5">
                            {NORTE_AREA_LABELS[areaKey] || areaKey}
                          </span>
                          <span className="text-[11px] text-textSecondary font-semibold">({areaRows.length} supervisors)</span>
                        </td>
                      </tr>
                      {areaRows.map(renderRow)}
                    </React.Fragment>
                  );
                })}
                {magNorteData.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-textSecondary text-sm font-semibold">No MAG NORTE supervisors found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: STANDARD TABLE FOR NON-MAG REGIONS */}
      {!isMag && (
        <div className="bg-surface rounded-3xl border border-border-divider shadow-xl overflow-hidden mt-6">
          <div className="px-8 py-6 border-b border-border-divider flex justify-between items-center bg-surface">
            <h3 className="text-[15px] font-extrabold tracking-wide text-textPrimary">SPVR WEEKLY SHIFT</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-surface border-b border-border-divider">
                  <th className="py-5 px-8 font-extrabold text-[10px] text-textSecondary uppercase tracking-widest">SPVR IDENTITY</th>
                  {dates.map((date, i) => (
                    <th key={i} className="py-5 px-4 font-extrabold text-[10px] text-textSecondary uppercase tracking-widest text-center">{date}</th>
                  ))}
                  <th className="py-4 px-6 font-extrabold text-[10px] uppercase tracking-widest text-center bg-[#1f497d]/20 border-l border-border-divider">
                    <div className="flex items-center justify-center gap-1.5">
                      <div>
                        <span className="text-textSecondary text-[10px] font-extrabold uppercase">TOTAL CURRENT</span><br/>
                        <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }} className="inline-block mt-0.5 px-2.5 py-0.5 rounded bg-[#1f497d] text-white font-bold tracking-normal shadow-sm">
                          {currDateLabel || '7D'}
                        </span>
                      </div>
                      <button
                        onClick={handleCopyCurrent7D}
                        disabled={spvrData.length === 0}
                        className={clsx(
                          "p-1.5 rounded-md transition-all hover:scale-105 cursor-pointer ml-0.5",
                          copiedKey === 'all'
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-[#1f497d]/40 hover:bg-[#1f497d] text-white border border-[#1f497d]/60 shadow-sm"
                        )}
                        title={`Copy column with navy blue header (${currDateLabel || '7D'}) for spreadsheet`}
                      >
                        {copiedKey === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </th>
                  <th className="py-5 px-6 font-extrabold text-[10px] text-textSecondary uppercase tracking-widest text-center bg-surface-header">
                    TOTAL PREVIOUS<br/><span className="text-[9px] text-textSecondary">{prevDateLabel ? `(${prevDateLabel})` : '(7D)'}</span>
                  </th>
                  <th className="py-5 px-8 font-extrabold text-[10px] text-textSecondary uppercase tracking-widest text-right bg-surface-header">SHIFT ANALYSIS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-divider bg-surface">
                {spvrData.map(renderRow)}
                {spvrData.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-textSecondary text-sm font-semibold">No data available for comparison</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
