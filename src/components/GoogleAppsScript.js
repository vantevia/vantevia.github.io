
// Copy this code into your Google Apps Script project (Code.gs)

// --- CONFIGURATION ---
const CONFIG = {
  // The Spreadsheet ID is extracted from your csvUrl: 
  // https://docs.google.com/spreadsheets/d/1jwBvS09EtK31B8uPRKMuCSTS-ghJYfRuVqfit1p_a7Q/...
  SPREADSHEET_ID: "1jwBvS09EtK31B8uPRKMuCSTS-ghJYfRuVqfit1p_a7Q",
  
  // EXACT names of your tabs in the Google Sheet
  SONG_SHEET_NAME: "TD3", 
  CHANGELOG_SHEET_NAME: "TD3-CL" 
};

function doPost(e) {
  // Verify authentication token
  const providedToken = e.postData.parameters?.token || e.parameter?.token;
  const expectedToken = "skibidi";
  
  if (providedToken !== expectedToken) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: 'Unauthorized: Invalid token' 
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Use lock to prevent concurrent overwrites
  const lock = LockService.getScriptLock();
  // Wait up to 30 seconds for other processes to finish
  lock.tryLock(30000);

  try {
    const jsonString = e.postData.contents;
    const payload = JSON.parse(jsonString);
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

    if (payload.action === 'save_songs') {
      saveSongs(ss, payload.data);
    } else if (payload.action === 'append_changelog') {
      appendChangelog(ss, payload.content);
    } else {
      throw new Error("Unknown action: " + payload.action);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: err.toString(),
      stack: err.stack
    })).setMimeType(ContentService.MimeType.JSON);
    
  } finally {
    lock.releaseLock();
  }
}

function saveSongs(ss, data) {
  const sheet = ss.getSheetByName(CONFIG.SONG_SHEET_NAME);
  if (!sheet) throw new Error("Sheet not found: " + CONFIG.SONG_SHEET_NAME);

  // Headers must match keys sent from frontend exactly
  const headers = [
    "#", 
    "SONG", 
    "ARTIST", 
    "REMIXER", 
    "INST/VOCAL", 
    "Date Added", 
    "TIER", 
    "MAIN", 
    "BACKGROUND", 
    "DURATION", 
    "LINK", 
    "IMAGE"
  ];

  // Convert array of objects to 2D array based on headers
  const rows = data.map(item => {
    return headers.map(header => {
      const val = item[header];
      return val === undefined || val === null ? "" : val;
    });
  });

  // Clear existing content (preserve header row 1)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  }

  // Write new content
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function appendChangelog(ss, content) {
  const sheet = ss.getSheetByName(CONFIG.CHANGELOG_SHEET_NAME);
  if (!sheet) throw new Error("Sheet not found: " + CONFIG.CHANGELOG_SHEET_NAME);

  // Insert a new row at the top (row 2, assuming row 1 is header)
  sheet.insertRowBefore(2);
  
  // Set the content
  // We assume the content is a single string that might contain newlines
  sheet.getRange(2, 1).setValue(content);
  
  // Optional: Set current timestamp in column B if you want automatic timestamps
  // sheet.getRange(2, 2).setValue(new Date());
}

// Simple GET endpoint to verify the script is running
function doGet(e) {
  return ContentService.createTextOutput("The Depths III API is running.");
}
