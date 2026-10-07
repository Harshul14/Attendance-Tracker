import { formatDate } from '../utils/attendance';
import StatusIndicator from './StatusIndicator';

export default function Header({ session, total, connection, user, onShare, onSignOut }) {
  return (
    <header className="header">
      <div className="header__main">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">✓</span>
          <div>
            <h1 className="brand__title">Candidate Attendance</h1>
            {session ? (
              <p className="brand__sub">
                <strong>{session.name}</strong> · {formatDate(session.date)}
              </p>
            ) : (
              <p className="brand__sub">Upload your Excel file to begin</p>
            )}
          </div>
        </div>
        <div className="header__side">
          {connection && <StatusIndicator connection={connection} />}
          {onShare && (
            <button type="button" className="btn btn--primary" onClick={onShare}>
              Share Session
            </button>
          )}
          {user && (
            <button type="button" className="btn btn--ghost" onClick={onSignOut} title={user.displayName || 'Guest'}>
              Sign out
            </button>
          )}
        </div>
      </div>
      {session && (
        <p className="header__meta">
          Created by {session.createdByName || 'Unknown'} · {total} candidates
          {session.groups.map((g) => ` · ${g}: ${session.counts?.[g] ?? ''}`).join('')}
        </p>
      )}
    </header>
  );
}
