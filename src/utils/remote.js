// Free, account-less JSON storage (https://jsonblob.com). Only encrypted envelopes are stored.
const BASE = 'https://jsonblob.com/api/jsonBlob';
const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };

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
    throw new RemoteError('Network unreachable', 'network');
  }
  if (response.status === 404) throw new RemoteError('Not found', 'gone');
  if (!response.ok) throw new RemoteError(`Server error ${response.status}`, 'server');
  return response;
}

export const remote = {
  async create(text) {
    const response = await request(BASE, { method: 'POST', headers: JSON_HEADERS, body: text });
    const location = response.headers.get('x-jsonblob') || response.headers.get('location') || '';
    const id = location.split('/').pop();
    if (!id) throw new RemoteError('The storage service did not return a session id', 'server');
    return id;
  },
  async read(id) {
    return (await request(`${BASE}/${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } })).text();
  },
  async write(id, text) {
    await request(`${BASE}/${encodeURIComponent(id)}`, { method: 'PUT', headers: JSON_HEADERS, body: text });
  },
};
