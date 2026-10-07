import { GROUPS } from './excel';
import { encrypt, generateKey } from './crypto';
import { remote } from './remote';

/** Accepts a full share link (?session=ID#k=KEY). */
export function parseSessionInput(text) {
  try {
    const url = new URL(String(text || '').trim());
    const id = url.searchParams.get('session');
    const key = new URLSearchParams(url.hash.slice(1)).get('k');
    return id && key ? { id, key } : null;
  } catch {
    return null;
  }
}

export function sessionLink(id, key) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  return `${url.toString()}?session=${encodeURIComponent(id)}#k=${key}`;
}

/** Builds the shared document (candidates are fixed; attendance starts empty) and stores it encrypted. */
export async function createSession({ operator, name, date, parsed, local = false }) {
  const groups = GROUPS.filter((g) => parsed.groups[g]?.length);
  const candidates = [];
  groups.forEach((group) => {
    parsed.groups[group].forEach((c, index) => {
      candidates.push({
        id: `${group}-${String(index + 1).padStart(4, '0')}`,
        name: c.name,
        group,
        serial: c.serial || '',
        seq: candidates.length + 1,
      });
    });
  });

  const doc = {
    meta: {
      name,
      date,
      createdByName: operator,
      createdAt: new Date().toISOString(),
      groups,
      counts: Object.fromEntries(groups.map((g) => [g, parsed.groups[g].length])),
    },
    candidates,
    att: {},
  };
  const key = generateKey();
  const id = await remote.create(await encrypt(doc, key), local);
  return { id, key };
}
