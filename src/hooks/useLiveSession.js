import { useCallback, useEffect, useRef, useState } from 'react';
import { remote } from '../utils/remote';
import { rememberSession, sessionCache } from '../utils/storage';
import { SyncEngine } from '../utils/sync';

/** Connects to a session and keeps it live. Returns the data plus `apply` to change attendance. */
export function useLiveSession(sessionId, key, operator) {
  const engineRef = useRef(null);
  const [state, setState] = useState({
    phase: 'joining',
    error: '',
    session: null,
    candidates: [],
    connection: { state: 'syncing', pending: 0 },
  });

  useEffect(() => {
    setState((s) => ({ ...s, phase: 'joining', error: '', session: null, candidates: [] }));
    const engine = new SyncEngine({
      id: sessionId,
      key,
      operator,
      remote,
      cache: sessionCache,
      onUpdate: ({ session, candidates, connection }) => {
        setState((s) => ({ ...s, phase: session ? 'ready' : s.phase, session, candidates, connection }));
        if (session) rememberSession({ id: sessionId, key, name: session.name, date: session.date });
      },
      onFatal: (error) => setState((s) => ({ ...s, phase: 'error', error })),
    });
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, [sessionId, key, operator]);

  const apply = useCallback((changes) => engineRef.current?.apply(changes), []);
  return { ...state, apply };
}
