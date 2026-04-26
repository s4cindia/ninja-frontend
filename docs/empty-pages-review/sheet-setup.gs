const CATEGORIES = ['legit_empty', 'detection_failure', 'unsure'];

const PAGE_TYPES = [
  'blank',
  'cover',
  'copyright',
  'dedication',
  'colophon',
  'chapter_divider',
  'toc_divider',
  'image_plate',
  'ornament',
  'text_normal',
  'text_complex',
  'table',
  'figure',
  'mixed',
  'other',
];

const TITLES = [
  'Govoni_Lovell',
  'Acharya',
  'Aulakh',
  'Logan-Scholer',
  'CrossbillsAndConifers',
];

const HEADER_ROWS = 1;
const VALIDATION_ROWS = 2000;
const SUMMARY_SHEET_NAME = 'Summary';

// ── Menu ──────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Empty Pages Tools')
    .addItem('Setup data sheet', 'setupSheet')
    .addSeparator()
    .addItem('Add rows from page ranges…', 'expandRangeList')
    .addSeparator()
    .addItem('Refresh summary tab', 'refreshSummary')
    .addToUi();
}

// ── 1. Setup ──────────────────────────────────────────

function setupSheet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  applyHeaderFormatting_(sheet);
  applyValidation_(sheet);
  applyConditionalFormatting_(sheet);
  applyColumnSizing_(sheet);

  SpreadsheetApp.getUi().alert(
    'Sheet ready. Use the "Empty Pages Tools" menu for range expansion and summary.'
  );
}

function applyHeaderFormatting_(sheet) {
  const lastCol = sheet.getLastColumn() || 8;
  sheet
    .getRange(1, 1, 1, lastCol)
    .setFontWeight('bold')
    .setBackground('#f3f4f6')
    .setHorizontalAlignment('left');
  sheet.setFrozenRows(HEADER_ROWS);
}

function applyValidation_(sheet) {
  const startRow = HEADER_ROWS + 1;
  const numRows = VALIDATION_ROWS;

  const titleRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(TITLES, true)
    .setAllowInvalid(true)
    .setHelpText('Pick a title — or type a new one when more are backfilled')
    .build();
  sheet.getRange(startRow, 1, numRows, 1).setDataValidation(titleRule);

  const pageNumberRule = SpreadsheetApp.newDataValidation()
    .requireNumberGreaterThan(0)
    .setAllowInvalid(false)
    .setHelpText('Page number — positive integer, 1-indexed')
    .build();
  sheet.getRange(startRow, 2, numRows, 1).setDataValidation(pageNumberRule);

  const categoryRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CATEGORIES, true)
    .setAllowInvalid(false)
    .setHelpText('Pick one: legit_empty / detection_failure / unsure')
    .build();
  sheet.getRange(startRow, 3, numRows, 1).setDataValidation(categoryRule);

  const pageTypeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(PAGE_TYPES, true)
    .setAllowInvalid(false)
    .setHelpText('Pick from the controlled vocabulary — use "other" + notes if nothing fits')
    .build();
  sheet.getRange(startRow, 4, numRows, 1).setDataValidation(pageTypeRule);

  const dateRule = SpreadsheetApp.newDataValidation()
    .requireDate()
    .setAllowInvalid(false)
    .setHelpText('Review date — YYYY-MM-DD')
    .build();
  sheet.getRange(startRow, 8, numRows, 1).setDataValidation(dateRule);
}

function applyConditionalFormatting_(sheet) {
  const range = sheet.getRange(`A${HEADER_ROWS + 1}:H${HEADER_ROWS + VALIDATION_ROWS}`);
  const rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$C2="legit_empty"')
      .setBackground('#e6f4ea')
      .setRanges([range])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$C2="detection_failure"')
      .setBackground('#fce8e6')
      .setRanges([range])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$C2="unsure"')
      .setBackground('#fef7e0')
      .setRanges([range])
      .build(),
  ];
  sheet.setConditionalFormatRules(rules);
}

function applyColumnSizing_(sheet) {
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 160);
  sheet.setColumnWidth(4, 160);
  sheet.setColumnWidth(5, 280);
  sheet.setColumnWidth(6, 320);
  sheet.setColumnWidth(7, 140);
  sheet.setColumnWidth(8, 120);
}

// ── 2. Range expansion ────────────────────────────────

function expandRangeList() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();

  const titleResp = ui.prompt(
    'Expand range list (1/3)',
    'Title (e.g. Govoni_Lovell):',
    ui.ButtonSet.OK_CANCEL
  );
  if (titleResp.getSelectedButton() !== ui.Button.OK) return;
  const title = titleResp.getResponseText().trim();
  if (!title) {
    ui.alert('Title is required.');
    return;
  }

  const rangeResp = ui.prompt(
    'Expand range list (2/3)',
    'Page ranges as shown in the modal (e.g. "1–3, 47–49, 120"):',
    ui.ButtonSet.OK_CANCEL
  );
  if (rangeResp.getSelectedButton() !== ui.Button.OK) return;
  const rangeStr = rangeResp.getResponseText().trim();
  const pages = parseRangeString_(rangeStr);
  if (pages.length === 0) {
    ui.alert('No valid pages parsed from input.');
    return;
  }

  const annotatorResp = ui.prompt(
    'Expand range list (3/3)',
    'Your name (annotator):',
    ui.ButtonSet.OK_CANCEL
  );
  if (annotatorResp.getSelectedButton() !== ui.Button.OK) return;
  const annotator = annotatorResp.getResponseText().trim();

  const today = new Date();
  const rows = pages.map((p) => [title, p, '', '', '', '', annotator, today]);
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, 8).setValues(rows);
  sheet.getRange(startRow, 8, rows.length, 1).setNumberFormat('yyyy-mm-dd');

  ui.alert(`Added ${rows.length} row(s) for ${title}. Fill in category and page_type next.`);
}

function parseRangeString_(str) {
  if (!str) return [];
  const pages = new Set();
  const tokens = str
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const token of tokens) {
    const dashMatch = token.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
    if (dashMatch) {
      const start = parseInt(dashMatch[1], 10);
      const end = parseInt(dashMatch[2], 10);
      if (start > 0 && end >= start) {
        for (let p = start; p <= end; p++) pages.add(p);
      }
      continue;
    }
    if (/^\d+$/.test(token)) {
      const n = parseInt(token, 10);
      if (n > 0) pages.add(n);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

// ── 3. Summary tab ────────────────────────────────────

function refreshSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dataSheet = getDataSheet_(ss);
  const dataSheetName = dataSheet.getName();
  const ref = `'${dataSheetName.replace(/'/g, "''")}'`;

  let summary = ss.getSheetByName(SUMMARY_SHEET_NAME);
  if (summary) {
    summary.clear();
    summary.clearConditionalFormatRules();
  } else {
    summary = ss.insertSheet(SUMMARY_SHEET_NAME);
  }

  // Section 1 — by title
  summary.getRange('A1').setValue('Summary by title').setFontWeight('bold').setFontSize(13);
  summary
    .getRange('A2:E2')
    .setValues([['title', 'total', 'legit_empty', 'detection_failure', 'unsure']])
    .setFontWeight('bold')
    .setBackground('#f3f4f6');

  summary.getRange('A3').setFormula(
    `=IFERROR(UNIQUE(FILTER(${ref}!A2:A, ${ref}!A2:A<>"")), "")`
  );
  summary.getRange('B3').setFormula(
    `=ARRAYFORMULA(IF(A3:A="", "", COUNTIF(${ref}!A:A, A3:A)))`
  );
  summary.getRange('C3').setFormula(
    `=ARRAYFORMULA(IF(A3:A="", "", COUNTIFS(${ref}!A:A, A3:A, ${ref}!C:C, "legit_empty")))`
  );
  summary.getRange('D3').setFormula(
    `=ARRAYFORMULA(IF(A3:A="", "", COUNTIFS(${ref}!A:A, A3:A, ${ref}!C:C, "detection_failure")))`
  );
  summary.getRange('E3').setFormula(
    `=ARRAYFORMULA(IF(A3:A="", "", COUNTIFS(${ref}!A:A, A3:A, ${ref}!C:C, "unsure")))`
  );

  // Section 2 — by page_type (across all titles)
  summary.getRange('G1').setValue('Page types observed').setFontWeight('bold').setFontSize(13);
  summary
    .getRange('G2:I2')
    .setValues([['page_type', 'count', '% of total']])
    .setFontWeight('bold')
    .setBackground('#f3f4f6');

  summary.getRange('G3').setFormula(
    `=IFERROR(SORT(UNIQUE(FILTER(${ref}!D2:D, ${ref}!D2:D<>""))), "")`
  );
  summary.getRange('H3').setFormula(
    `=ARRAYFORMULA(IF(G3:G="", "", COUNTIF(${ref}!D:D, G3:G)))`
  );
  summary.getRange('I3').setFormula(
    `=ARRAYFORMULA(IF(H3:H="", "", H3:H / SUM(H3:H)))`
  );
  summary.getRange('I3:I').setNumberFormat('0.0%');

  // Section 3 — detection_failure rows for ML team
  summary
    .getRange('A20')
    .setValue('Detection failures (priority for ML team)')
    .setFontWeight('bold')
    .setFontSize(13);
  summary
    .getRange('A21:F21')
    .setValues([['title', 'page_number', 'page_type', 'expected_content', 'notes', 'annotator']])
    .setFontWeight('bold')
    .setBackground('#fce8e6');
  summary
    .getRange('A22')
    .setFormula(
      `=IFERROR(QUERY(${ref}!A2:H, "select A, B, D, E, F, G where C='detection_failure' order by A, B", 0), "")`
    );

  // Cosmetics
  summary.setColumnWidth(1, 200);
  summary.setColumnWidth(2, 100);
  summary.setColumnWidth(3, 160);
  summary.setColumnWidth(4, 280);
  summary.setColumnWidth(5, 320);
  summary.setColumnWidth(6, 140);
  summary.setColumnWidth(7, 200);
  summary.setColumnWidth(8, 100);
  summary.setColumnWidth(9, 100);
  summary.setFrozenRows(2);

  ss.setActiveSheet(summary);
  SpreadsheetApp.getUi().alert(
    'Summary refreshed.\n\n' +
      '• Top-left: per-title category totals\n' +
      '• Top-right: page-type distribution across all titles\n' +
      '• Below: filtered list of detection_failure rows for the ML team'
  );
}

function getDataSheet_(ss) {
  const sheets = ss.getSheets();
  for (const s of sheets) {
    if (s.getName() !== SUMMARY_SHEET_NAME) return s;
  }
  return ss.getActiveSheet();
}
