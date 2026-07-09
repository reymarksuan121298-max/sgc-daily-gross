// SET YOUR PROVIDED SPREADSHEET ID
const SPREADSHEET_ID = '1ICiYfsmv4dOzSifsa-0Kk1d0WvlMQ2ILaq_KHBIzo04'; 

const BRANCHES = {
  MAGUINDANAO: {
    name: 'Maguindanao',
    tabName: 'maguindanao',
    token: 'Bearer 142725|tF7k4j0Gy0FMkJJnv43H8nkONO6E3BELhnAPANjM',
    baseUrl: 'https://stl-mag-api.com/api',
    idParam: '2',
    fetchSupervisors: false
  },
  IMPERIAL: {
    name: 'Imperial (Cotabato)',
    tabName: 'imperial',
    token: 'Bearer 56420|m5oBfQqTl33XWmt33FzjLfYWoWEK6w3jPcOWlfz5',
    baseUrl: 'https://stl-cotabato-api.com/api',
    idParam: '2',
    fetchSupervisors: true
  }
};

/**
 * -------------------------------------------------------------
 * TRIGGERS (SET THESE UP IN APPS SCRIPT DASHBOARD)
 * - Set syncMaguindanao to run at 12:00 AM
 * - Set syncImperial to run at 12:15 AM
 * -------------------------------------------------------------
 */
function syncMaguindanao() {
  runSyncForBranch(BRANCHES.MAGUINDANAO);
}

function syncImperial() {
  runSyncForBranch(BRANCHES.IMPERIAL);
}

/**
 * -------------------------------------------------------------
 * AUTOMATED TIME-DRIVEN SYNC (DAILY)
 * -------------------------------------------------------------
 */
function runSyncForBranch(branch) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Calculate exact date for "Yesterday"
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  
  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  };
  
  const targetDateStr = formatDate(yesterday);
  const displayDateName = yesterday.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });

  try {
    Logger.log(`Starting sync for ${branch.name}...`);
      const options = {
        method: 'GET',
        headers: { 'Authorization': branch.token },
        muteHttpExceptions: true
      };
      
      // 1. Fetch Supervisors (if required by the branch)
      const spvrMap = {};
      if (branch.fetchSupervisors) {
        Logger.log(`Fetching supervisors for ${branch.name}...`);
        const spvrRes = UrlFetchApp.fetch(`${branch.baseUrl}/accountant/supervisor?id=${branch.idParam}`, options);
        if (spvrRes.getResponseCode() === 200) {
          const sData = JSON.parse(spvrRes.getContentText());
          if (sData.data) {
            sData.data.forEach(s => {
              spvrMap[s.id] = (s.fullName || s.username || 'UNKNOWN SUPERVISOR').toUpperCase();
            });
          }
        }
      }
      
      // 2. Fetch all Active Tellers
      Logger.log(`Fetching active tellers for ${branch.name}...`);
      const tellersRes = UrlFetchApp.fetch(`${branch.baseUrl}/accountant/ActiveTellers?id=${branch.idParam}`, options);
      let tellers = [];
      if (tellersRes.getResponseCode() === 200) {
        const tData = JSON.parse(tellersRes.getContentText());
        const allTellers = tData.data || [];
        // Only process tellers that are currently active
        tellers = allTellers.filter(t => t.isActive);
      }
      
      if (tellers.length === 0) {
        Logger.log(`No active tellers found for ${branch.name}.`);
        return; // skip to next branch
      }
      
      Logger.log(`Found ${tellers.length} active tellers. Fetching bets for ${targetDateStr}...`);
      
      // 3. Fetch Bets (Summaries) for each Teller in small batches
      const requests = tellers.map(teller => ({
        url: `${branch.baseUrl}/teller/bet?tellerId=${teller.id}&from=${targetDateStr}&to=${targetDateStr}`,
        method: 'GET',
        headers: { 'Authorization': branch.token },
        muteHttpExceptions: true
      }));
      
      const CHUNK_SIZE = 10;
      const allTransactions = []; // Store all valid transactions here
      
      for (let i = 0; i < requests.length; i += CHUNK_SIZE) {
        const chunk = requests.slice(i, i + CHUNK_SIZE);
        try {
          const responses = UrlFetchApp.fetchAll(chunk);
          responses.forEach((res, idx) => {
            const teller = tellers[i + idx];
            if (res.getResponseCode() === 200) {
              const betData = JSON.parse(res.getContentText());
              if (betData.data && betData.data.length > 0) {
                let spvrName = spvrMap[teller.supervisor];
                if (!spvrName) {
                   spvrName = (teller.name || 'UNKNOWN SUPERVISOR').toUpperCase();
                }
                const tName = (teller.fullName || teller.username || 'UNKNOWN TELLER').toUpperCase();
                
                betData.data.forEach(summary => {
                  allTransactions.push({ summary, spvrName, tName });
                });
              }
            }
          });
        } catch (e) {
          Logger.log(`Failed to fetch chunk starting at index ${i}: ${e.message}`);
        }
        Utilities.sleep(1000);
      }

      if (allTransactions.length === 0) {
        Logger.log(`No transactions found for ${branch.name}.`);
        return; // skip to next branch
      }

      Logger.log(`Found ${allTransactions.length} total transactions. Fetching detailed bet lines...`);

      // 4. Fetch the specific Bet Details for each transaction ID
      const detailRequests = allTransactions.map(tx => ({
        url: `${branch.baseUrl}/teller/bet/${tx.summary.transactionId}`,
        method: 'GET',
        headers: { 'Authorization': branch.token },
        muteHttpExceptions: true
      }));

      const DETAIL_CHUNK_SIZE = 25; // larger chunk since we might have many transactions
      const allBetsGrouped = {};

      for (let i = 0; i < detailRequests.length; i += DETAIL_CHUNK_SIZE) {
        const chunk = detailRequests.slice(i, i + DETAIL_CHUNK_SIZE);
        try {
          const responses = UrlFetchApp.fetchAll(chunk);
          responses.forEach((res, idx) => {
            const tx = allTransactions[i + idx];
            
            if (!allBetsGrouped[tx.spvrName]) {
              allBetsGrouped[tx.spvrName] = [];
            }

            if (res.getResponseCode() === 200) {
              const detailData = JSON.parse(res.getContentText());
              if (detailData.data && detailData.data.length > 0) {
                detailData.data.forEach(detailLine => {
                  // Attach teller name to each detail line
                  detailLine.tellerName = tx.tName;
                  // If the overall summary is void, consider lines void as well
                  if (tx.summary.isVoid === 1) detailLine.isVoid = 1;
                  
                  allBetsGrouped[tx.spvrName].push(detailLine);
                });
              } else {
                // Fallback to summary if no details returned for some reason
                tx.summary.tellerName = tx.tName;
                allBetsGrouped[tx.spvrName].push(tx.summary);
              }
            } else {
               // Fallback to summary if error
               tx.summary.tellerName = tx.tName;
               allBetsGrouped[tx.spvrName].push(tx.summary);
            }
          });
        } catch (e) {
          Logger.log(`Failed detail chunk at index ${i}: ${e.message}`);
        }
        // Sleep to respect rate limits
        Utilities.sleep(1000);
      }
      
      // 4. Save grouped bets to Google Sheet matching the 8-column layout
      saveBetsToSheet(ss, branch.tabName, displayDateName, allBetsGrouped);
      Logger.log(`Successfully synced ${branch.name}!`);
      
  } catch (err) {
    Logger.log(`Error processing ${branch.name}: ${err.toString()}`);
  }
}

/**
 * -------------------------------------------------------------
 * HELPER: Save grouped data to the sheet matching your layout
 * -------------------------------------------------------------
 */
function saveBetsToSheet(ss, tabName, displayDateName, grouped) {
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  }
  
  const rows = [];
  const headers = ["Teller", "Trans. ID", "Draw", "Bet No.", "Bet Code", "Bet Amount", "Win Amount", "Status"];
  
  // Add a distinct Date Title row (8 columns wide)
  rows.push([`${displayDateName.toUpperCase()} TELLER BETS`, "", "", "", "", "", "", ""]);
  
  for (const spvrName in grouped) {
    rows.push([spvrName, "", "", "", "", "", "", ""]);
    rows.push(headers);
    
    let totalAmt = 0;
    grouped[spvrName].forEach(b => {
      const amt = Number(b.betAmount || b.totalBetAmount) || 0;
      if (b.isVoid !== 1) totalAmt += amt;
      
      rows.push([
        b.tellerName,                              // Teller
        b.transactionId || '',                     // Trans. ID
        formatDraw(b.drawTime, b.created_at),      // Draw
        b.betNo || '',                             // Bet No.
        b.betCode || '',                           // Bet Code
        amt,                                       // Bet Amount
        Number(b.winAmount) || 0,                  // Win Amount
        b.isVoid === 1 ? 'VOID' : 'ACTIVE'         // Status (isVoid)
      ]);
    });
    
    // Add subtotal row
    rows.push(["TOTAL (ACTIVE)", "", "", "", "", totalAmt, 0, ""]);
    rows.push(["", "", "", "", "", "", "", ""]); // spacing
  }
  
  // Only write to the sheet if there was data for this day
  if (rows.length === 1) {
    rows.push(["No bets recorded for this date", "", "", "", "", "", "", ""]);
    rows.push(["", "", "", "", "", "", "", ""]);
  } else {
    rows.push(["", "", "", "", "", "", "", ""]);
  }
  
  if (rows.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    const range = sheet.getRange(startRow, 1, rows.length, 8);
    range.setValues(rows);
    
    // Apply bold styling
    let currentRow = startRow;
    
    // Date Name Row
    sheet.getRange(currentRow, 1, 1, 8).merge().setFontWeight("bold").setBackground("#e2e8f0").setHorizontalAlignment("center").setFontSize(12);
    currentRow++;
    
    if (rows.length > 3) {
      for (const spvrName in grouped) {
        // Supervisor Name & Header
        sheet.getRange(currentRow, 1, 1, 8).setFontWeight("bold").setFontColor("#3b82f6");
        sheet.getRange(currentRow + 1, 1, 1, 8).setFontWeight("bold");
        
        const numBets = grouped[spvrName].length;
        
        // Loop over the bets to color the VOID status appropriately (Red for VOID, Green for ACTIVE)
        for (let j = 0; j < numBets; j++) {
           const statusValue = grouped[spvrName][j].isVoid === 1 ? 'VOID' : 'ACTIVE';
           const statusCell = sheet.getRange(currentRow + 2 + j, 8, 1, 1);
           if (statusValue === 'VOID') {
             statusCell.setFontColor("#ef4444").setFontWeight("bold");
           } else {
             statusCell.setFontColor("#10b981");
           }
        }
        
        // Subtotal row styling
        const subtotalRow = currentRow + 2 + numBets;
        sheet.getRange(subtotalRow, 1, 1, 8).setFontWeight("bold").setBackground("#f8fafc");
        sheet.getRange(subtotalRow, 6, 1, 1).setFontColor("#10b981"); // green amount
        
        currentRow += numBets + 4;
      }
    }
  }
}

/**
 * Helper to format the Draw string like "5PM 2026-05-14"
 */
function formatDraw(timeStr, dateStr) {
  let drawStr = "";
  if (timeStr) {
    const hour = parseInt(timeStr, 10);
    if (!isNaN(hour)) {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      drawStr = `${hour12}${ampm}`;
    } else {
      drawStr = timeStr;
    }
  }
  const dStr = dateStr ? dateStr.split(' ')[0] : '';
  if (drawStr && dStr) return `${drawStr} ${dStr}`;
  return drawStr || dStr || 'N/A';
}

/**
 * -------------------------------------------------------------
 * GET: Standard API route if you want to pull data from Sheet
 * Usage: https://script.google.com/.../exec?tabName=maguindanao
 * -------------------------------------------------------------
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const tabName = e.parameter.tabName;
    if (!tabName) return ContentService.createTextOutput("Missing ?tabName").setMimeType(ContentService.MimeType.TEXT);
    
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) return ContentService.createTextOutput("Tab not found").setMimeType(ContentService.MimeType.TEXT);
    
    const data = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: data })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(err.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}
