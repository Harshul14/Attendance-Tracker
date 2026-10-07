import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { GROUPS } from './excel';

const BATCH_SIZE = 400;
const KEY_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const sessionRef = (id) => doc(db, 'sessions', id);
const memberRef = (id, uid) => doc(db, 'sessions', id, 'members', uid);
const candidatesRef = (id) => collection(db, 'sessions', id, 'candidates');

export class SessionError extends Error {}

const displayNameOf = (user) => user.displayName || (user.isAnonymous ? 'Guest' : user.email) || 'Unknown';

function generateAccessKey(length = 24) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => KEY_ALPHABET[b % KEY_ALPHABET.length]).join('');
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Accepts a full share link or a bare session ID. */
export function parseSessionInput(text) {
  const value = String(text || '').trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    const id = url.searchParams.get('session');
    if (id) return { id, key: url.searchParams.get('key') || '' };
  } catch {
    // not a URL — treat as an ID
  }
  return /^[A-Za-z0-9_-]{6,}$/.test(value) ? { id: value, key: '' } : null;
}

export function buildShareUrl(session, id) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('session', id);
  url.searchParams.set('key', session.accessKey);
  return url.toString();
}

/**
 * Creates a session: one metadata document, one membership document for the owner,
 * and one document per candidate so devices can update candidates independently.
 */
export async function createSession({ user, name, date, parsed }) {
  const ref = doc(collection(db, 'sessions'));
  const accessKey = generateAccessKey();
  const groups = GROUPS.filter((g) => parsed.groups[g]?.length);
  const createdByName = displayNameOf(user);

  const first = writeBatch(db);
  first.set(ref, {
    name,
    date,
    createdAt: serverTimestamp(),
    createdBy: user.uid,
    createdByName,
    accessKey,
    groups,
    counts: Object.fromEntries(groups.map((g) => [g, parsed.groups[g].length])),
  });
  first.set(memberRef(ref.id, user.uid), { key: accessKey, name: createdByName, joinedAt: serverTimestamp() });
  await first.commit();

  const docs = [];
  let seq = 0;
  groups.forEach((group) => {
    parsed.groups[group].forEach((candidate, index) => {
      seq += 1;
      docs.push({
        id: `${group}-${String(index + 1).padStart(4, '0')}`,
        data: {
          name: candidate.name,
          group,
          serial: candidate.serial || '',
          seq,
          attendance: 'unmarked',
          updatedAt: null,
          updatedBy: null,
        },
      });
    });
  });

  for (const part of chunk(docs, BATCH_SIZE)) {
    const batch = writeBatch(db);
    part.forEach(({ id, data }) => batch.set(doc(candidatesRef(ref.id), id), data));
    await batch.commit();
  }
  return { id: ref.id, accessKey };
}

/** Makes sure the signed-in user is a member of the session (needs the key on first join). */
export async function ensureMembership(user, id, key) {
  try {
    const existing = await getDoc(memberRef(id, user.uid));
    if (existing.exists()) return;
  } catch {
    // Offline or not yet allowed — fall through to the join attempt.
  }
  if (!key) {
    throw new SessionError('This session needs its full share link (including the key) the first time you join.');
  }
  if (!navigator.onLine) throw new SessionError('You need an internet connection to join a session for the first time.');
  try {
    await setDoc(memberRef(id, user.uid), { key, name: displayNameOf(user), joinedAt: serverTimestamp() });
  } catch {
    throw new SessionError('This session link is invalid, incomplete or the session does not exist.');
  }
}

export const subscribeSession = (id, onData, onError) =>
  onSnapshot(sessionRef(id), { includeMetadataChanges: true }, onData, onError);

export const subscribeCandidates = (id, onData, onError) =>
  onSnapshot(candidatesRef(id), { includeMetadataChanges: true }, onData, onError);

const auditFields = (status, uid) => ({ attendance: status, updatedAt: serverTimestamp(), updatedBy: uid });

/** Updates a single candidate document — other candidates are never touched. */
export const setAttendance = (sessionId, candidateId, status, uid) =>
  updateDoc(doc(candidatesRef(sessionId), candidateId), auditFields(status, uid));

export async function setAttendanceBulk(sessionId, candidateIds, status, uid) {
  for (const part of chunk(candidateIds, BATCH_SIZE)) {
    const batch = writeBatch(db);
    part.forEach((id) => batch.update(doc(candidatesRef(sessionId), id), auditFields(status, uid)));
    await batch.commit();
  }
}

