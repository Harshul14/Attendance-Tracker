// Storage adapters. Only encrypted envelopes are ever stored (see crypto.js).
//  - cloud: restful-api.dev, a free public JSON store that needs no account
//  - local: this browser only (fallback when the cloud service is unreachable; cannot be shared)
const CLOUD = 'https://api.restful-api.dev/objects';
const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };
const LOCAL_PREFIX = 'local-';

export class RemoteError extends Error {
  constructor(message, kind) {
    super(message);
    this.kind = kind; // 'network' | 'gone' | 'server'
  }
}

export const isLocalId = (id) => String(id).startsWith(LOCAL_PREFIX);

async function request(url, options) {
  let response;
  try {
    response = await fetch(url, { cache: 'no-store', ...options });
  } catch {
    throw new RemoteError('the sharing service could not be reached (offline or blocked by the browser)', 'network');
  }
  if (response.status === 404) throw new RemoteError('not found', 'gone');
  if (!response.ok) throw new RemoteError(`the sharing service answered with error ${response.status}`, 'server');
  return response;
}

const cloud = {
  async create(text) {
    const response = await request(CLOUD, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name: 'attendance-session', data: JSON.parse(text) }),
    });
    const { id } = await response.json();
    if (!id) throw new RemoteError('the sharing service did not return a session id', 'server');
    return id;
  },
  async read(id) {
    const response = await request(`${CLOUD}/${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } });
    return JSON.stringify((await response.json()).data);
  },
  async write(id, text) {
    await request(`${CLOUD}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name: 'attendance-session', data: JSON.parse(text) }),
    });
  },
};

const local = {
  async create(text) {
    const id = `${LOCAL_PREFIX}${Math.random().toString(36).slice(2, 10)}`;
    await this.write(id, text);
    return id;
  },
  async read(id) {
    const text = window.localStorage.getItem(`cat:blob:${id}`);
    if (!text) throw new RemoteError('not found', 'gone');
    return text;
  },
  async write(id, text) {
    try {
      window.localStorage.setItem(`cat:blob:${id}`, text);
    } catch {
      throw new RemoteError('this browser blocked local storage', 'server');
    }
  },
};

export const remote = {
  create: (text, useLocal = false) => (useLocal ? local : cloud).create(text),
  read: (id) => (isLocalId(id) ? local : cloud).read(id),
  write: (id, text) => (isLocalId(id) ? local : cloud).write(id, text),
};
