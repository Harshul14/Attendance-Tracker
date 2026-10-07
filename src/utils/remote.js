// Storage adapters. Only encrypted envelopes are ever stored (see crypto.js).
// A session id is "<provider>-<providerId>" so any device knows where to look.
//   r = restful-api.dev   x = json.extendsclass.com   (free, no account)
//   local = this browser only (fallback; cannot be shared)
const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };
const CLOUD_ORDER = ['r'];

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

const CHUNK_SIZE = 600;

function splitText(text, size = CHUNK_SIZE) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

const restful = {
  label: 'restful-api.dev',
  url: 'https://api.restful-api.dev/objects',
  manifests: new Map(),

  async create(text) {
    const chunks = splitText(text);
    const version = Date.now();

    // Small payload fits safely in a single object without triggering 500
    if (chunks.length === 1) {
      const response = await request(this.url, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ name: 'attendance-session', data: { c: chunks[0], v: version } }),
      });
      const { id } = await response.json();
      if (!id) throw new RemoteError('returned no id', 'server');
      this.manifests.set(id, { ids: null, version, text });
      return id;
    }

    // Larger payloads: split into chunks <= 600 chars to avoid restful-api.dev 500 column overflow
    const chunkIds = await Promise.all(
      chunks.map(async (chunk, idx) => {
        const response = await request(this.url, {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ name: `attendance-chunk-${idx}`, data: { c: chunk } }),
        });
        const { id } = await response.json();
        if (!id) throw new RemoteError('chunk returned no id', 'server');
        return id;
      }),
    );

    // Root manifest stores list of chunk IDs
    const response = await request(this.url, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name: 'attendance-session', data: { ids: chunkIds, v: version } }),
    });
    const { id: rootId } = await response.json();
    if (!rootId) throw new RemoteError('returned no id', 'server');

    this.manifests.set(rootId, { ids: chunkIds, version, text });
    return rootId;
  },

  async read(id) {
    const response = await request(`${this.url}/${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } });
    const doc = await response.json();
    const data = doc?.data;
    if (!data) throw new RemoteError('not found or empty', 'gone');

    const cached = this.manifests.get(id);

    // Format 1: Chunked manifest
    if (Array.isArray(data.ids)) {
      if (cached && cached.version === data.v && cached.text) {
        return cached.text;
      }
      const chunkTexts = await Promise.all(
        data.ids.map(async (chunkId) => {
          const chunkRes = await request(`${this.url}/${encodeURIComponent(chunkId)}`, { headers: { Accept: 'application/json' } });
          const chunkDoc = await chunkRes.json();
          return chunkDoc?.data?.c ?? '';
        }),
      );
      const text = chunkTexts.join('');
      this.manifests.set(id, { ids: data.ids, version: data.v, text });
      return text;
    }

    // Format 2: Single chunk directly in data.c
    if (typeof data.c === 'string') {
      this.manifests.set(id, { ids: null, version: data.v, text: data.c });
      return data.c;
    }

    // Format 3: Legacy format where data was envelope JSON
    return JSON.stringify(data);
  },

  async write(id, text) {
    const chunks = splitText(text);
    const version = Date.now();
    let entry = this.manifests.get(id);

    if (!entry) {
      const res = await request(`${this.url}/${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } });
      const doc = await res.json();
      entry = {
        ids: Array.isArray(doc?.data?.ids) ? doc.data.ids : null,
        version: doc?.data?.v ?? 0,
        text: '',
      };
    }

    // If single chunk and previously single chunk
    if (chunks.length === 1 && !entry.ids) {
      await request(`${this.url}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({ name: 'attendance-session', data: { c: chunks[0], v: version } }),
      });
      this.manifests.set(id, { ids: null, version, text });
      return;
    }

    // Multi-chunk update
    const prevIds = entry.ids || [];
    const updatedIds = [];
    const ops = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (i < prevIds.length) {
        const chunkId = prevIds[i];
        updatedIds.push(chunkId);
        ops.push(
          request(`${this.url}/${encodeURIComponent(chunkId)}`, {
            method: 'PUT',
            headers: JSON_HEADERS,
            body: JSON.stringify({ name: `attendance-chunk-${i}`, data: { c: chunk } }),
          }),
        );
      } else {
        const idx = i;
        ops.push(
          (async () => {
            const res = await request(this.url, {
              method: 'POST',
              headers: JSON_HEADERS,
              body: JSON.stringify({ name: `attendance-chunk-${idx}`, data: { c: chunk } }),
            });
            const { id: newId } = await res.json();
            updatedIds[idx] = newId;
          })(),
        );
      }
    }

    await Promise.all(ops);

    await request(`${this.url}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name: 'attendance-session', data: { ids: updatedIds, v: version } }),
    });

    this.manifests.set(id, { ids: updatedIds, version, text });
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
