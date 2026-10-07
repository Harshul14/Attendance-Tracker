import { useCallback, useEffect, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInAnonymously, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

const friendlyAuthError = (error) => {
  switch (error?.code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in the Firebase console yet.';
    case 'auth/unauthorized-domain':
      return 'This website address is not in Firebase Authentication → Authorized domains.';
    case 'auth/network-request-failed':
      return 'No internet connection. Please try again when you are online.';
    default:
      return 'Sign-in failed. Please try again.';
  }
};

export function useAuth() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => onAuthStateChanged(auth, (next) => {
    setUser(next);
    setReady(true);
  }), []);

  const run = useCallback(async (action) => {
    setError('');
    try {
      await action();
    } catch (e) {
      setError(friendlyAuthError(e));
    }
  }, []);

  const signInWithGoogle = useCallback(
    () =>
      run(async () => {
        const provider = new GoogleAuthProvider();
        try {
          await signInWithPopup(auth, provider);
        } catch (e) {
          // Popups are blocked in some mobile/in-app browsers.
          if (e?.code === 'auth/popup-blocked') await signInWithRedirect(auth, provider);
          else throw e;
        }
      }),
    [run],
  );
  const signInAsGuest = useCallback(() => run(() => signInAnonymously(auth)), [run]);
  const logOut = useCallback(() => run(() => signOut(auth)), [run]);

  return { user, ready, error, signInWithGoogle, signInAsGuest, logOut };
}
