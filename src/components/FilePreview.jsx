import { useState } from 'react';
import { GROUPS } from '../utils/excel';
import { formatDate, todayIso } from '../utils/attendance';

export default function FilePreview({ parsed, creating, error, onStart, onStartLocal, onCancel }) {
  const [name, setName] = useState('Morning Session');
  const [date, setDate] = useState(todayIso());
  const total = GROUPS.reduce((sum, g) => sum + parsed.groups[g].length, 0);

  return (
    <main className="panel panel--narrow">
      <h2>Check your file</h2>
      <dl className="preview">
        <div><dt>File</dt><dd>{parsed.fileName}</dd></div>
        {GROUPS.map((g) => (
          <div key={g}><dt>{g}</dt><dd>{parsed.groups[g].length} candidates</dd></div>
        ))}
        <div className="preview__total"><dt>Total</dt><dd>{total} candidates</dd></div>
      </dl>

      {parsed.warnings.map((w) => (
        <p key={w} className="alert alert--warn">{w}</p>
      ))}

      <div className="fields">
        <label htmlFor="session-name">Session name</label>
        <input id="session-name" className="input" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="session-date">Date</label>
        <input id="session-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <p className="muted">{formatDate(date)}</p>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          <p>{error}</p>
          <p className="muted" style={{ marginTop: '0.4rem', color: 'inherit' }}>
            Tip: You can use <strong>Start on This Device</strong> to proceed offline without cloud sharing.
          </p>
        </div>
      )}

      <div className="stack">
        <button
          type="button"
          className="btn btn--primary btn--xl"
          disabled={creating || !date}
          onClick={() => onStart({ name: name.trim() || 'Attendance Session', date })}
        >
          {creating ? 'Creating shared session…' : 'Start Shared Session (Cloud)'}
        </button>
        <button
          type="button"
          className="btn btn--xl"
          disabled={creating || !date}
          onClick={() => onStartLocal({ name: name.trim() || 'Attendance Session', date })}
        >
          Start on This Device (Offline / Fast)
        </button>
        <button type="button" className="btn" disabled={creating} onClick={onCancel}>
          Choose a different file
        </button>
      </div>
    </main>
  );
}
