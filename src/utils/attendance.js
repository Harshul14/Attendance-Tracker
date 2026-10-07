export const STATUS = { UNMARKED: 'unmarked', PRESENT: 'present', ABSENT: 'absent' };

/** UNMARKED -> PRESENT -> ABSENT -> UNMARKED */
export const NEXT_STATUS = {
  unmarked: STATUS.PRESENT,
  present: STATUS.ABSENT,
  absent: STATUS.UNMARKED,
};

export const STATUS_META = {
  present: { icon: '✓', label: 'Present' },
  absent: { icon: '✕', label: 'Absent' },
  unmarked: { icon: '—', label: 'Not marked' },
};

export const FILTERS = [
  { id: 'all', label: 'All' },
  { id: STATUS.PRESENT, label: 'Present' },
  { id: STATUS.ABSENT, label: 'Absent' },
  { id: STATUS.UNMARKED, label: 'Unmarked' },
];

const emptyCounts = () => ({ total: 0, present: 0, absent: 0, unmarked: 0 });

export function computeStats(candidates, groups) {
  const overall = emptyCounts();
  const byGroup = Object.fromEntries(groups.map((g) => [g, emptyCounts()]));
  candidates.forEach((c) => {
    const status = STATUS_META[c.attendance] ? c.attendance : STATUS.UNMARKED;
    [overall, byGroup[c.group]].forEach((bucket) => {
      if (!bucket) return;
      bucket.total += 1;
      bucket[status] += 1;
    });
  });
  const marked = overall.present + overall.absent;
  return {
    ...overall,
    rate: overall.total ? Math.round((overall.present / overall.total) * 100) : 0,
    completion: overall.total ? Math.round((marked / overall.total) * 100) : 0,
    byGroup,
  };
}

const squash = (text) => String(text).toLowerCase().replace(/\s+/g, '');

export function filterCandidates(candidates, query, filter) {
  const q = squash(query);
  return candidates.filter(
    (c) => (filter === 'all' || c.attendance === filter) && (!q || squash(c.name).includes(q)),
  );
}

export function formatDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
