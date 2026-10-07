export default function AuthScreen({ error, onGoogle, onGuest }) {
  return (
    <main className="panel panel--narrow">
      <h2>Sign in to continue</h2>
      <p className="muted">
        Attendance is stored in your private Firebase project so it survives refreshes and can be shared between
        devices.
      </p>
      <div className="stack">
        <button type="button" className="btn btn--primary btn--xl" onClick={onGoogle}>
          Continue with Google
        </button>
        <button type="button" className="btn btn--xl" onClick={onGuest}>
          Continue as guest
        </button>
      </div>
      {error && <p className="alert alert--error" role="alert">{error}</p>}
      <p className="hint">Guests keep their access on this browser. Use Google to resume on any device.</p>
    </main>
  );
}
