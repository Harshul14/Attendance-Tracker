// Storage adapters. Only encrypted envelopes are ever stored (see crypto.js).
// A session id is "<provider>-<providerId>" so any device knows where to look.
//   r = restful-api.dev   x = json.extendsclass.com   (free, no account)
//   local = this browser only (fallback; cannot be shared)
const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };
const CLOUD_ORDER = ['r', 'x'];

export class RemoteError extends Error {
  constructor(message, kind) {
    super(message);
    this.kind = kind; // 'network' | 'gone' | 'server'
  }
}

async function request(url, options) {
  let response;
  try {
    response = await fetch(url, { cache: 'no-store', ...options });
  } catch {
    throw new RemoteError('could not be reached (offline, or blocked by the browser)', 'network');
  }
  if (response.status === 404) throw new RemoteError('not found', 'gone');
  if (!response.ok) {
    let detail = '';
    try {
      detail = (await response.text()).replace(/\s+/g, ' ').slice(0, 100);
    } catch {
      // ignore
    }
    throw new RemoteError(`error ${response.status}${detail ? ` (${detail})` : ''}`, 'server');
  }
  return response;
}

const restful = {
  label: 'restful-api.dev',
  url: 'https://api.restful-api.dev/objects',
  wrap: (text) => JSON.stringify({ name: 'attendance-session', data: JSON.parse(text) }),
  async create(text) {
    const response = await request(this.url, { method: 'POST', headers: JSON_HEADERS, body: this.wrap(text) });
    const { id } = await response.json();
    if (!id) throw new RemoteError('returned no id', 'server');
    return id;
  },
  async read(id) {
    const response = await request(`${this.url}/${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } });
    return JSON.stringify((await response.json()).data);
  },
  async write(id, text) {
    await request(`${this.url}/${encodeURIComponent(id)}`, { method: 'PUT', headers: JSON_HEADERS, body: this.wrap(text) });
  },
};

const extendsclass = {
  label: 'json.extendsclass.com',
  url: 'https://json.extendsclass.com/bin',
  async create(text) {
    const response = await request(this.url, { method: 'POST', headers: JSON_HEADERS, body: text });
    const body = await response.json();
    const id = body.id || String(body.uri || '').split('/').pop();
    if (!id) throw new RemoteError('returned no id', 'server');
    return id;
  },
  async read(id) {
    return (await request(`${this.url}/${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } })).text();
  },
  async write(id, text) {
    await request(`${this.url}/${encodeURIComponent(id)}`, { method: 'PUT', headers: JSON_HEADERS, body: text });
  },
};

const local = {
  label: 'this device',
  async create(text) {
    const id = Math.random().toString(36).slice(2, 10);
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

const providers = { r: restful, x: extendsclass, local };

function route(id) {
  const split = String(id).indexOf('-');
  const provider = providers[String(id).slice(0, split)];
  if (!provider) throw new RemoteError('unknown session type', 'gone');
  return { provider, rawId: String(id).slice(split + 1) };
}

export const isLocalId = (id) => String(id).startsWith('local-');

export const remote = {
  /** Tries each free service in turn; with useLocal it only stores on this device. */
  async create(text, useLocal = false) {
    if (useLocal) return `local-${await local.create(text)}`;
    const failures = [];
    for (const tag of CLOUD_ORDER) {
      try {
        return `${tag}-${await providers[tag].create(text)}`;
      } catch (error) {
        failures.push(`${providers[tag].label}: ${error.message}`);
      }
    }
    throw new RemoteError(failures.join(' · '), 'server');
  },
  read(id) {
    const { provider, rawId } = route(id);
    return provider.read(rawId);
  },
  write(id, text) {
    const { provider, rawId } = route(id);
    return provider.write(rawId, text);
  },
};
