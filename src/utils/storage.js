// Local storage is only a convenience cache (recent sessions list).
// Firestore is the source of truth for attendance.
const RECENT_KEY = 'cat:recent-sessions';
const MAX_RECENT = 8;

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be full or blocked (private mode). The app works without it.
  }
}

export const getRecentSessions = (uid) =>
  read(RECENT_KEY, [])
    .filter((s) => s.uid === uid)
    .slice(0, MAX_RECENT);

export function rememberSession(entry) {
  const others = read(RECENT_KEY, []).filter((s) => !(s.id === entry.id && s.uid === entry.uid));
  write(RECENT_KEY, [{ ...entry, openedAt: Date.now() }, ...others].slice(0, MAX_RECENT * 4));
}

export function forgetSession(id, uid) {
  write(
    RECENT_KEY,
    read(RECENT_KEY, []).filter((s) => !(s.id === id && s.uid === uid)),
  );
}
