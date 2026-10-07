import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

// Firebase *client* configuration only. These values are public identifiers, not admin credentials.
// Access control is enforced by firestore.rules.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const REQUIRED = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  appId: 'VITE_FIREBASE_APP_ID',
};
export const missingConfig = Object.entries(REQUIRED)
  .filter(([key]) => !config[key])
  .map(([, envName]) => envName);
export const isFirebaseConfigured = missingConfig.length === 0;

let auth = null;
let db = null;

if (isFirebaseConfigured) {
  const app = initializeApp(config);
  auth = getAuth(app);
  // IndexedDB cache: attendance stays visible and editable offline and syncs when back online.
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    db = initializeFirestore(app, {});
  }
}

export { auth, db };
