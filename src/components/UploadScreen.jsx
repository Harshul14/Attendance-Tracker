import { useRef, useState } from 'react';
import { parseExcelFile } from '../utils/excel';
import { parseSessionInput } from '../utils/sessions';
import { formatDate } from '../utils/attendance';

export default function UploadScreen({ recent, onParsed, onJoin, onForget }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinText, setJoinText] = useState('');

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setError('');
    setBusy(true);
    try {
      onParsed(await parseExcelFile(file));
    } catch (e) {
      setError(e.message || 'Something went wrong while reading the file.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = (event) => {
    event.preventDefault();
    const target = parseSessionInput(joinText);
    if (!target) {
      setError('Please paste a valid session link or session ID.');
      return;
    }
    setError('');
    onJoin(target);
  };

  return (
    <main className="panel panel--narrow">
      <h2>Start an attendance session</h2>
      <p className="muted">Your Excel file is read in your browser. Only candidate names are saved to your session.</p>

      <input ref={inputRef} type="file" accept=".xlsx,.xls" className="visually-hidden" onChange={handleFile} aria-label="Upload Excel file" />
      <div className="stack">
        <button type="button" className="btn btn--primary btn--xl" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? 'Reading file…' : 'Upload Excel File'}
        </button>
        <button type="button" className="btn btn--xl" onClick={() => setJoining((v) => !v)} aria-expanded={joining}>
          Join Existing Session
        </button>
      </div>

      {joining && (
        <form className="join" onSubmit={handleJoin}>
          <label htmlFor="join-input">Session link / Session ID</label>
          <input id="join-input" className="input" value={joinText} onChange={(e) => setJoinText(e.target.value)} placeholder="Paste the share link" autoFocus />
          <button type="submit" className="btn btn--primary">Open session</button>
        </form>
      )}

      {error && <p className="alert alert--error" role="alert">{error}</p>}

      {recent.length > 0 && (
        <section aria-label="Recent sessions" className="recent">
          <h3>Recent sessions</h3>
          <ul>
            {recent.map((item) => (
              <li key={item.id}>
                <button type="button" className="recent__open" onClick={() => onJoin({ id: item.id, key: item.key })}>
                  <strong>{item.name}</strong>
                  <span>{formatDate(item.date)}</span>
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => onForget(item.id)} aria-label={`Remove ${item.name} from this list`}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
