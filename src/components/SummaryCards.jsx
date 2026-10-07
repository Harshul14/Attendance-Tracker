const CARDS = [
  { key: 'total', label: 'Total', tone: 'neutral' },
  { key: 'present', label: 'Present', tone: 'present' },
  { key: 'absent', label: 'Absent', tone: 'absent' },
  { key: 'unmarked', label: 'Unmarked', tone: 'unmarked' },
];

export default function SummaryCards({ stats }) {
  return (
    <section className="summary" aria-label="Attendance summary">
      <div className="summary__cards">
        {CARDS.map(({ key, label, tone }) => (
          <div key={key} className={`stat stat--${tone}`}>
            <span className="stat__label">{label}</span>
            <span className="stat__value">{stats[key]}</span>
          </div>
        ))}
        <div className="stat stat--rate">
          <span className="stat__label">Attendance Rate</span>
          <span className="stat__value">{stats.rate}%</span>
        </div>
      </div>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.completion} aria-label="Marking completed">
        <div className="progress__bar" style={{ width: `${stats.completion}%` }} />
      </div>
      <p className="progress__text">{stats.completion}% of candidates marked</p>
    </section>
  );
}
