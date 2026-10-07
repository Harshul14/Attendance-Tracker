import { decrypt, encrypt } from './crypto';

/**
 * Sync engine. The shared document is { meta, candidates[], att{} } where
 *   att[candidateId] = [status, timestamp, markedBy]
 * Each candidate is a last-writer-wins register, so two devices changing different
 * candidates never clash, and the same candidate converges everywhere (newest wins).
 * Local changes stay in `pending` until the server copy is seen to contain them,
 * and are re-pushed otherwise, so a racing write from another device can't lose them.
 */
export const isNewer = (a, b) => a[1] > b[1] || (a[1] === b[1] && a[2] > b[2]);

export function mergeAtt(a = {}, b = {}) {
  const out = { ...a };
  Object.entries(b).forEach(([id, entry]) => {
    if (!out[id] || isNewer(entry, out[id])) out[id] = entry;
  });
  return out;
}

const POLL_VISIBLE_MS = 3000;
const POLL_HIDDEN_MS = 15000;
const PUSH_DEBOUNCE_MS = 250;

export class SyncEngine {
  constructor({ id, key, operator, remote, cache, onUpdate, onFatal }) {
    Object.assign(this, { id, key, operator, remote, cache, onUpdate, onFatal });
    const saved = cache.load(id);
    this.doc = saved?.doc ?? null;
    this.pending = new Map(saved?.pending ?? []);
    this.view = new Map();
    this.lastTs = 0;
    this.reachable = true;
    this.hasSynced = false;
    this.busy = false;
    this.stopped = false;
    this.timer = null;
    this.onVisibility = () => this.schedule(0);
    this.onNet = () => this.schedule(0);
  }

  start() {
    window.addEventListener('online', this.onNet);
    window.addEventListener('offline', this.onNet);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.emit();
    this.schedule(0);
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    window.removeEventListener('online', this.onNet);
    window.removeEventListener('offline', this.onNet);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  schedule(delay) {
    if (this.stopped) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync(), delay);
  }

  nextTs() {
    this.lastTs = Math.max(Date.now(), this.lastTs + 1);
    return this.lastTs;
  }

  /** changes: [{ id, status }] */
  apply(changes) {
    if (!this.doc) return;
    changes.forEach(({ id, status }) => {
      const entry = [status, this.nextTs(), this.operator];
      this.doc.att[id] = entry;
      this.pending.set(id, entry);
    });
    this.persist();
    this.emit();
    this.schedule(PUSH_DEBOUNCE_MS);
  }

  persist() {
    this.cache.save(this.id, { doc: this.doc, pending: [...this.pending] });
  }

  connection() {
    const offline = !navigator.onLine || !this.reachable;
    if (offline) return { state: 'offline', pending: this.pending.size };
    if (this.pending.size > 0 || !this.hasSynced) return { state: 'syncing', pending: this.pending.size };
    return { state: 'live', pending: 0 };
  }

  candidates() {
    if (!this.doc) return [];
    return this.doc.candidates.map((c) => {
      const attendance = this.doc.att[c.id]?.[0] ?? 'unmarked';
      const pending = this.pending.has(c.id);
      const cached = this.view.get(c.id);
      if (cached && cached.attendance === attendance && cached.pending === pending) return cached;
      const next = { ...c, attendance, pending };
      this.view.set(c.id, next);
      return next;
    });
  }

  emit() {
    if (this.stopped) return;
    this.onUpdate({ session: this.doc?.meta ?? null, candidates: this.candidates(), connection: this.connection() });
  }

  async sync() {
    if (this.busy || this.stopped) return;
    this.busy = true;
    let nextDelay = document.hidden ? POLL_HIDDEN_MS : POLL_VISIBLE_MS;
    try {
      const text = await this.remote.read(this.id);
      let remoteDoc;
      try {
        remoteDoc = await decrypt(text, this.key);
      } catch {
        this.onFatal('This session link is incomplete or damaged (the encryption key does not match).');
        return;
      }
      this.reachable = true;
      this.hasSynced = true;

      const merged = {
        meta: remoteDoc.meta,
        candidates: remoteDoc.candidates,
        att: mergeAtt(this.doc?.att, remoteDoc.att),
      };
      this.pending.forEach((mine, id) => {
        const seen = remoteDoc.att[id];
        if (seen && !isNewer(mine, seen)) this.pending.delete(id);
      });
      this.doc = merged;
      this.persist();
      this.emit();

      if (this.pending.size > 0) {
        await this.remote.write(this.id, await encrypt(merged, this.key));
        nextDelay = 800; // quickly confirm our write landed
      }
    } catch (error) {
      if (error?.kind === 'gone' && !this.doc) {
        this.onFatal('This session no longer exists or the link is wrong.');
        return;
      }
      this.reachable = false;
      this.emit();
      nextDelay = POLL_VISIBLE_MS * 2;
    } finally {
      this.busy = false;
      this.emit();
      this.schedule(nextDelay);
    }
  }
}
