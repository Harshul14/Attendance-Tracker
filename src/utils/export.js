import * as XLSX from 'xlsx';
import { computeStats, formatDate } from './attendance';

const LABELS = { present: 'Present', absent: 'Absent', unmarked: 'Unmarked' };
const safeSheetName = (name) => name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);

export function buildAttendanceWorkbook(session, candidates) {
  const stats = computeStats(candidates, session.groups);
  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['Session', session.name],
    ['Date', formatDate(session.date)],
    ['Created by', session.createdByName || ''],
    [],
    ['Total Candidates', stats.total],
    ['Present', stats.present],
    ['Absent', stats.absent],
    ['Unmarked', stats.unmarked],
    ['Attendance Percentage', `${stats.rate}%`],
  ]);
  summarySheet['!cols'] = [{ wch: 24 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  session.groups.forEach((group) => {
    const rows = candidates
      .filter((c) => c.group === group)
      .map((c, index) => [c.serial || index + 1, c.name, LABELS[c.attendance] || LABELS.unmarked]);
    const sheet = XLSX.utils.aoa_to_sheet([['S No.', 'Candidate Name', 'Attendance'], ...rows]);
    sheet['!cols'] = [{ wch: 8 }, { wch: 36 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(workbook, sheet, safeSheetName(group));
  });
  return workbook;
}

export function exportAttendance(session, candidates) {
  XLSX.writeFile(buildAttendanceWorkbook(session, candidates), `attendance-${session.date}.xlsx`);
}
