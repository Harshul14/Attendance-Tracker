import * as XLSX from 'xlsx';

export const GROUPS = ['LR03', 'LR06'];

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls'];
const NAME_HEADERS = ['NAME', 'CANDIDATENAME', 'CANDIDATE', 'STUDENTNAME'];
const SERIAL_HEADERS = ['SNO', 'SNO.', 'SRNO', 'SR.NO', 'SLNO', 'SERIAL', '#'];

export class ExcelError extends Error {}

const compact = (value) => String(value ?? '').replace(/\s+/g, '').toUpperCase();

// "LR03", "LR 03", "lr-03" and "LR3" all identify the LR03 column.
function matchesGroup(value, group) {
  const digits = group.replace(/\D/g, '');
  const prefix = group.replace(/\d/g, '');
  const text = compact(value).replace(/[-_.:]/g, '');
  return new RegExp(`^${prefix}0*${Number(digits)}$`).test(text);
}

function findHeader(rows, group) {
  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r];
    for (let c = 0; c < row.length; c += 1) {
      if (typeof row[c] === 'string' && matchesGroup(row[c], group)) return { row: r, col: c };
    }
  }
  return null;
}

// The names may sit directly under the group header, or under a sub-header
// such as "S No. | Name" (the group header is usually merged across both).
function locateColumns(rows, header, colLimit) {
  const lastCol = Math.min(header.col + 3, colLimit);
  for (let r = header.row + 1; r <= Math.min(header.row + 3, rows.length - 1); r += 1) {
    let serialCol = -1;
    for (let c = header.col; c < lastCol; c += 1) {
      const key = compact(rows[r][c]);
      if (SERIAL_HEADERS.includes(key)) serialCol = c;
      if (NAME_HEADERS.includes(key)) return { nameCol: c, serialCol, firstRow: r + 1 };
    }
  }
  return { nameCol: header.col, serialCol: -1, firstRow: header.row + 1 };
}

function readGroup(rows, header, colLimit) {
  const { nameCol, serialCol, firstRow } = locateColumns(rows, header, colLimit);
  const candidates = [];
  for (let r = firstRow; r < rows.length; r += 1) {
    const cell = rows[r][nameCol];
    if (typeof cell !== 'string') continue;
    const name = cell.trim();
    if (!name) continue;
    const serial = serialCol >= 0 ? rows[r][serialCol] : '';
    candidates.push({ name, serial: serial === '' || serial == null ? '' : String(serial) });
  }
  return candidates;
}

function readSheet(worksheet) {
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', blankrows: false });
  const headers = Object.fromEntries(GROUPS.map((g) => [g, findHeader(rows, g)]));
  const groups = {};
  GROUPS.forEach((group) => {
    const header = headers[group];
    if (!header) return;
    // Do not run into the neighbouring group's columns.
    const colLimit = Math.min(
      ...GROUPS.filter((g) => g !== group && headers[g] && headers[g].col > header.col).map((g) => headers[g].col),
      Infinity,
    );
    groups[group] = readGroup(rows, header, colLimit);
  });
  return groups;
}

/** Parses an Excel workbook held in memory. Throws ExcelError with a friendly message. */
export function parseWorkbook(buffer, fileName = 'file') {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'array' });
  } catch {
    throw new ExcelError('This file could not be read. It may be corrupted or not a real Excel file.');
  }
  if (!workbook.SheetNames.length) throw new ExcelError('This Excel file contains no worksheets.');

  let best = null;
  for (const sheetName of workbook.SheetNames) {
    const groups = readSheet(workbook.Sheets[sheetName]);
    const found = Object.keys(groups);
    const total = found.reduce((sum, g) => sum + groups[g].length, 0);
    if (found.length && (!best || total > best.total)) best = { sheetName, groups, total };
  }

  if (!best) {
    throw new ExcelError(
      'LR03 and LR06 columns could not be found. Please upload an Excel file containing these columns.',
    );
  }
  if (best.total === 0) throw new ExcelError('The LR03 / LR06 columns were found but contain no candidate names.');

  const warnings = [];
  const groups = {};
  GROUPS.forEach((group) => {
    const list = best.groups[group];
    if (!list) {
      warnings.push(`The ${group} column was not found. Only the other column will be used.`);
      groups[group] = [];
      return;
    }
    groups[group] = list;
    if (!list.length) warnings.push(`The ${group} column is empty.`);
    const seen = new Map();
    list.forEach(({ name }) => {
      const key = name.toLowerCase().replace(/\s+/g, ' ');
      seen.set(key, (seen.get(key) || 0) + 1);
    });
    const repeated = [...seen.values()].filter((n) => n > 1).length;
    if (repeated) {
      warnings.push(
        `${group} has ${repeated} repeated name${repeated > 1 ? 's' : ''}. They are kept as separate candidates.`,
      );
    }
  });

  return { fileName, sheetName: best.sheetName, groups, warnings };
}

export async function parseExcelFile(file) {
  if (!file) throw new ExcelError('No file selected.');
  const lower = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    throw new ExcelError('Wrong file type. Please choose an .xlsx or .xls Excel file.');
  }
  if (file.size === 0) throw new ExcelError('This file is empty.');
  let buffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new ExcelError('The file could not be opened. Please try again.');
  }
  return parseWorkbook(buffer, file.name);
}
