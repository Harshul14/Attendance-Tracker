import CandidateCard from './CandidateCard';

export default function CandidateList({ group, candidates, counts, onCycle }) {
  return (
    <section className="list" aria-labelledby={`list-${group}`}>
      <div className="list__head">
        <div>
          <h2 id={`list-${group}`}>{group}</h2>
          <p className="muted">{counts.total} Candidates</p>
        </div>
        <p className="list__counts">
          <span className="pill pill--present">Present: {counts.present}</span>
          <span className="pill pill--absent">Absent: {counts.absent}</span>
          <span className="pill pill--unmarked">Unmarked: {counts.unmarked}</span>
        </p>
      </div>
      {candidates.length ? (
        <div className="list__items">
          {candidates.map((c) => (
            <CandidateCard key={c.id} candidate={c} onCycle={onCycle} />
          ))}
        </div>
      ) : (
        <p className="empty">No candidates match.</p>
      )}
    </section>
  );
}
