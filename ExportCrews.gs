/**
 * Export Crews — Google Apps Script
 *
 * Reads every tab of the active spreadsheet (Paddlers, Benches, and each
 * race tab) and POSTs the full crew payload to the dragonboat API in a
 * single call. Replaces the old "download as xlsx + run convert_excel.py"
 * flow, which was dropping tabs during the xlsx export.
 *
 * SETUP
 *   1. Open the crews spreadsheet → Extensions → Apps Script.
 *   2. Paste this file in as `ExportCrews.gs`.
 *   3. Fill in API_BASE and API_TOKEN in the CONFIG block below.
 *      - Get API_TOKEN by calling POST /api/login once (Sanctum) and
 *        copying the returned `token` field.
 *   4. Save, reload the spreadsheet. A new menu "Crews" appears.
 *   5. Click Crews → Export to API.
 *
 * The payload shape matches what the old convert_excel.py produced into
 * src/data/data.json, so the backend import endpoint can consume it
 * directly.
 */

// ---------- CONFIG ----------
const API_BASE = 'https://your-api-host.example.com/api'; // no trailing slash
const LOGIN_ENDPOINT  = '/login';
const IMPORT_ENDPOINT = '/import'; // admin-only bulk import on the Laravel side
// ----------------------------

const TOKEN_PROPERTY = 'DRAGONBOAT_API_TOKEN';
const EMAIL_PROPERTY = 'DRAGONBOAT_API_EMAIL';


function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Crews')
    .addItem('Log in', 'loginToApi')
    .addItem('Export to API', 'exportCrewsToApi')
    .addItem('Preview JSON (log only)', 'previewCrewsJson')
    .addSeparator()
    .addItem('Clear saved token', 'clearSavedToken')
    .addToUi();
}

/**
 * Prompt for admin credentials, call POST /login, and persist the returned
 * Sanctum token in script properties so subsequent Export runs don't have to
 * ask again. The stored token lives in the script's own property store —
 * it's scoped to this spreadsheet's bound script, not shared globally.
 */
function loginToApi() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();

  const lastEmail = props.getProperty(EMAIL_PROPERTY) || '';
  const emailResp = ui.prompt(
    'Log in',
    'Admin email' + (lastEmail ? ' (leave blank for ' + lastEmail + ')' : '') + ':',
    ui.ButtonSet.OK_CANCEL
  );
  if (emailResp.getSelectedButton() !== ui.Button.OK) return;
  const email = emailResp.getResponseText().trim() || lastEmail;
  if (!email) {
    ui.alert('Email is required.');
    return;
  }

  const pwResp = ui.prompt('Log in', 'Password for ' + email + ':', ui.ButtonSet.OK_CANCEL);
  if (pwResp.getSelectedButton() !== ui.Button.OK) return;
  const password = pwResp.getResponseText();
  if (!password) {
    ui.alert('Password is required.');
    return;
  }

  const resp = UrlFetchApp.fetch(API_BASE + LOGIN_ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Accept': 'application/json' },
    payload: JSON.stringify({ email: email, password: password }),
    muteHttpExceptions: true,
  });

  const code = resp.getResponseCode();
  const body = resp.getContentText();
  if (code < 200 || code >= 300) {
    ui.alert('Login failed (' + code + ').\n' + body.substring(0, 500));
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch (e) {
    ui.alert('Login succeeded but response was not JSON:\n' + body.substring(0, 500));
    return;
  }
  if (!parsed.token) {
    ui.alert('Login response did not include a token:\n' + body.substring(0, 500));
    return;
  }

  props.setProperty(TOKEN_PROPERTY, parsed.token);
  props.setProperty(EMAIL_PROPERTY, email);

  const role = parsed.user && parsed.user.role ? parsed.user.role : 'unknown';
  ui.alert('Logged in as ' + email + ' (' + role + '). Token saved.');
}

function clearSavedToken() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty(TOKEN_PROPERTY);
  SpreadsheetApp.getUi().alert('Saved token cleared.');
}

function getApiToken_() {
  return PropertiesService.getScriptProperties().getProperty(TOKEN_PROPERTY) || '';
}

function exportCrewsToApi() {
  const ui = SpreadsheetApp.getUi();

  const token = getApiToken_();
  if (!token) {
    ui.alert('No saved token. Run Crews → Log in first.');
    return;
  }

  let payload;
  try {
    payload = buildPayload_();
  } catch (e) {
    ui.alert('Failed to build payload: ' + e.message);
    throw e;
  }

  const resp = UrlFetchApp.fetch(API_BASE + IMPORT_ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/json',
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const code = resp.getResponseCode();
  const body = resp.getContentText();
  Logger.log('POST ' + IMPORT_ENDPOINT + ' -> ' + code);
  Logger.log(body);

  if (code >= 200 && code < 300) {
    ui.alert('Export OK (' + code + ').\n' +
             payload.athletes.length + ' athletes, ' +
             payload.races.length + ' races sent.');
  } else {
    ui.alert('Export failed (' + code + ').\n' + body.substring(0, 800));
  }
}

function previewCrewsJson() {
  const payload = buildPayload_();
  Logger.log(JSON.stringify(payload, null, 2));
  SpreadsheetApp.getUi().alert(
    'Payload logged. Open View → Logs to inspect.\n' +
    payload.athletes.length + ' athletes, ' +
    payload.races.length + ' races.'
  );
}

// =========================================================================
//  Payload builder — mirrors convert_excel.py
// =========================================================================

function buildPayload_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetsByName = {};
  ss.getSheets().forEach(function (s) {
    // getDataRange returns a 2D array, 1-indexed access via row-1/col-1.
    sheetsByName[s.getName()] = s.getDataRange().getValues();
  });

  const ps = sheetsByName['Paddlers'];
  if (!ps) throw new Error('Missing "Paddlers" tab');

  // --- Race column headers on the Paddlers tab (columns N..Y) ---
  const raceCols = {};
  for (let col = 14; col <= 25; col++) {
    const name = cell_(ps, 1, col);
    if (name) raceCols[col] = String(name);
  }

  // --- Athletes ---
  const athletes = [];
  for (let row = 4; row <= 65; row++) {
    const name = cell_(ps, row, 2);
    if (!name || name === 'empty') continue;

    const weight = cell_(ps, row, 3);

    const assignments = [];
    Object.keys(raceCols).forEach(function (colStr) {
      const col = Number(colStr);
      const v = cell_(ps, row, col);
      if (v && String(v).trim().toLowerCase() === 'x') {
        assignments.push(raceCols[col]);
      }
    });

    const inWomen = assignments.some(function (a) { return a.indexOf('Women') !== -1; });
    const inOpen  = assignments.some(function (a) { return a.toLowerCase().indexOf('open') !== -1; });
    let gender;
    if (inWomen && !inOpen) gender = 'F';
    else if (inOpen && !inWomen) gender = 'M';
    else if (inWomen && inOpen) gender = 'M';
    else gender = 'U';

    athletes.push({
      id: row - 3,
      name: String(name).trim(),
      weight: weight ? Number(weight) : 0,
      gender: gender,
      raceAssignments: assignments,
    });
  }

  // --- Resolve unknown genders by scanning boat tabs ---
  const womenNames = {};
  const menNames   = {};
  athletes.forEach(function (a) {
    if (a.raceAssignments.some(function (r) { return r.indexOf('Women') !== -1; })) womenNames[a.name] = true;
    if (a.raceAssignments.some(function (r) { return r.toLowerCase().indexOf('open') !== -1; })) menNames[a.name] = true;
  });

  Object.keys(sheetsByName).forEach(function (sn) {
    if (sn.indexOf('Women') === -1 || sn.indexOf('TEMPLATE') !== -1) return;
    const ws = sheetsByName[sn];
    for (let r = 1; r <= ws.length; r++) {
      const v = cell_(ws, r, 6);
      if (v && ['Empty', 'HELM', 'DRUMMER', 'TOTAL'].indexOf(v) === -1) {
        womenNames[String(v).trim()] = true;
      }
    }
  });

  const skipLabels = {
    'LEFT': 1, 'RIGHT': 1, 'Empty': 1, 'empty': 1, 'reserves:': 1,
    'FRONT': 1, 'REAR': 1, 'DRUMMER': 1, 'HELM': 1, 'TOTAL': 1,
    'RACE': 1, 'MEDAL': 1, 'Left/Right': 1, 'Top/Down': 1,
  };

  Object.keys(sheetsByName).forEach(function (sn) {
    if (sn.indexOf('TEMPLATE') !== -1 || sn === 'Paddlers' || sn === 'Benches') return;
    const ws = sheetsByName[sn];
    const isWomen = sn.indexOf('Women') !== -1;
    const isOpen  = sn.toLowerCase().indexOf('open') !== -1;
    for (let r = 1; r <= ws.length; r++) {
      [4, 8].forEach(function (c) {
        const val = cell_(ws, r, c);
        if (val && typeof val !== 'number' && !skipLabels[val]) {
          const nm = String(val).trim();
          if (isWomen) womenNames[nm] = true;
          else if (isOpen) menNames[nm] = true;
        }
      });
    }
  });

  athletes.forEach(function (a) {
    if (a.gender !== 'U') return;
    if (womenNames[a.name] && !menNames[a.name]) { a.gender = 'F'; return; }
    if (menNames[a.name]) { a.gender = 'M'; return; }
    const fn = a.name.split(' ')[0] || '';
    a.gender = fn.charAt(fn.length - 1) === 'a' ? 'F' : 'M';
  });

  // --- Bench factors ---
  const bs = sheetsByName['Benches'];
  if (!bs) throw new Error('Missing "Benches" tab');
  const benchStandard = [];
  const benchSmall = [];
  for (let col = 2; col <= 11; col++) {
    const v = cell_(bs, 2, col);
    if (v !== null && v !== undefined) benchStandard.push(Number(v));
  }
  for (let col = 2; col <= 6; col++) {
    const v = cell_(bs, 3, col);
    if (v !== null && v !== undefined) benchSmall.push(Number(v));
  }

  // --- Races + layouts ---
  function findAthleteId(name) {
    if (!name || name === 'Empty' || name === 'empty') return null;
    const n = String(name).trim();
    for (let i = 0; i < athletes.length; i++) {
      if (athletes[i].name === n) return athletes[i].id;
    }
    return null;
  }

  const raceSheets = Object.keys(sheetsByName).filter(function (sn) {
    return sn.indexOf('TEMPLATE') === -1 && sn !== 'Paddlers' && sn !== 'Benches';
  });

  const races = [];
  const layouts = {};
  raceSheets.forEach(function (sn) {
    const ws = sheetsByName[sn];
    const templateRef = String(cell_(ws, 2, 1) || '');
    let boatType, numRows;
    if (templateRef.indexOf('Small') !== -1 || sn.indexOf('SM ') !== -1) {
      boatType = 'small'; numRows = 5;
    } else {
      boatType = 'standard'; numRows = 10;
    }

    const raceId = sn.replace(/ /g, '_');
    let distance = '';
    ['200m', '500m', '1000m', '2000m'].forEach(function (d) {
      if (sn.indexOf(d) !== -1) distance = d;
    });
    const category = sn.replace(distance, '').trim();

    races.push({
      id: raceId,
      name: sn,
      boatType: boatType,
      numRows: numRows,
      distance: distance,
      category: category,
    });

    const drummerName = cell_(ws, 9, 6);
    const drummerId = (drummerName && drummerName !== 'Empty') ? findAthleteId(drummerName) : null;

    const helmRow = boatType === 'standard' ? 38 : 28;
    const helmName = cell_(ws, helmRow, 6);
    const helmId = (helmName && helmName !== 'Empty') ? findAthleteId(helmName) : null;

    const left = [];
    const right = [];
    for (let i = 0; i < numRows; i++) {
      const seatRow = 14 + (i * 2);
      left.push(findAthleteId(cell_(ws, seatRow, 4)));
      right.push(findAthleteId(cell_(ws, seatRow, 8)));
    }

    const reserves = [];
    const resRows = boatType === 'standard' ? [41, 42] : [31];
    resRows.forEach(function (rr) {
      [4, 8].forEach(function (c) {
        const rid = findAthleteId(cell_(ws, rr, c));
        if (rid) reserves.push(rid);
      });
    });

    layouts[raceId] = {
      drummer: drummerId,
      helm: helmId,
      left: left,
      right: right,
      reserves: reserves,
    };
  });

  return {
    athletes: athletes,
    benchFactors: {
      standard: benchStandard,
      small: benchSmall,
    },
    races: races,
    layouts: layouts,
  };
}

/** 1-indexed cell access matching openpyxl's ws.cell(row, col).value. */
function cell_(grid, row, col) {
  const r = row - 1, c = col - 1;
  if (r < 0 || r >= grid.length) return null;
  const rowArr = grid[r];
  if (c < 0 || c >= rowArr.length) return null;
  const v = rowArr[c];
  if (v === '' || v === null || v === undefined) return null;
  return v;
}
