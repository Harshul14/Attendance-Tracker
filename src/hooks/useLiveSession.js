import { useEffect, useMemo, useRef, useState } from 'react';
import { ensureMembership, subscribeCandidates, subscribeSession } from '../utils/sessions';
import { rememberSession } from '../utils/storage';
import { useOnline } from './useOnline';

const toCandidate = (docSnap) => ({
  id: docSnap.id,
  ...docSnap.data(),
  pending: docSnap.metadata.hasPendingWrites,
});

const describeError = (error) =>
  error?.code === 'permission-denied'
    ? 'You do not have access to this session. Open the full share link you were given.'
    : 'The session could not be loaded. Check your connection and try again.';

/**
 * Subscribes to a session and its candidates in real time.
 * Candidate objects keep their identity unless their own document changed,
 * so memoised cards only re-render when needed.
 */
export function useLiveSession(user, sessionId, accessKey) {
  const online = useOnline();
  const [phase, setPhase] = useState('joining'); // joining | ready | error
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [cache, setCache] = useState({ fromCache: true, pending: 0 });
  const map = useRef(new Map());

  useEffect(() => {
    let cancelled = false;
    let stops = [];
    map.current = new Map();
    setPhase('joining');
    setError('');
    setSession(null);
    setCandidates([]);

    const fail = (e) => {
      if (cancelled) return;
      setError(e?.message && !e.code ? e.message : describeError(e));
      setPhase('error');
    };

    (async () => {
      try {
        await ensureMembership(user, sessionId, accessKey);
      } catch (e) {
        fail(e);
        return;
      }
      if (cancelled) return;

      stops.push(
        subscribeSession(
          sessionId,
          (snap) => {
            if (cancelled) return;
            if (!snap.exists()) {
              if (!snap.metadata.fromCache) fail({ message: 'This session no longer exists.' });
              return;
            }
            const data = snap.data();
            setSession(data);
            setPhase('ready');
            rememberSession({ id: sessionId, key: data.accessKey, name: data.name, date: data.date, uid: user.uid });
          },
          fail,
        ),
      );

      stops.push(
        subscribeCandidates(
          sessionId,
          (snap) => {
            if (cancelled) return;
            snap.docChanges({ includeMetadataChanges: true }).forEach((change) => {
              if (change.type === 'removed') map.current.delete(change.doc.id);
              else map.current.set(change.doc.id, toCandidate(change.doc));
            });
            setCandidates(Array.from(map.current.values()).sort((a, b) => a.seq - b.seq));
            setCache({
              fromCache: snap.metadata.fromCache,
              pending: snap.docs.filter((d) => d.metadata.hasPendingWrites).length,
            });
          },
          fail,
        ),
      );
    })();

    return () => {
      cancelled = true;
      stops.forEach((stop) => stop());
      stops = [];
    };
  }, [user, sessionId, accessKey]);

  // live = in sync with the server, syncing = changes waiting / catching up, offline = no connection
  const connection = useMemo(() => {
    if (!online) return { state: 'offline', pending: cache.pending };
    if (cache.pending > 0 || cache.fromCache) return { state: 'syncing', pending: cache.pending };
    return { state: 'live', pending: 0 };
  }, [online, cache]);

  return { phase, error, session, candidates, connection };
}
