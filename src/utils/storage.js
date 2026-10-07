// localStorage holds the local copy of each session (so it opens instantly and works offline),
// the recent-sessions list and the operator's name. The shared copy lives in the encrypted remote blob.
const RECENT_KEY = 'cat:recent-sessions';
const OPERATOR_KEY = 'cat:operator';
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
    // Storage may be full or blocked (private mode). The app keeps working with the remote copy.
  }
}

export const getRecentSessions = () => read(RECENT_KEY, []).slice(0, MAX_RECENT);

export function rememberSession(entry) {
  const others = read(RECENT_KEY, []).filter((s) => s.id !== entry.id);
  write(RECENT_KEY, [entry, ...others].slice(0, MAX_RECENT));
}

export function forgetSession(id) {
  write(RECENT_KEY, read(RECENT_KEY, []).filter((s) => s.id !== id));
  try {
    window.localStorage.removeItem(`cat:session:${id}`);
  } catch {
    // ignore
  }
}

export function getOperator() {
  const saved = read(OPERATOR_KEY, '');
  if (saved) return saved;
  const generated = `Device-${Math.random().toString(36).slice(2, 6)}`;
  write(OPERATOR_KEY, generated);
  return generated;
}

export const setOperator = (name) => write(OPERATOR_KEY, name.trim().slice(0, 40) || getOperator());

export const sessionCache = {
  load: (id) => read(`cat:session:${id}`, null),
  save: (id, data) => write(`cat:session:${id}`, data),
};
