import { useState } from 'react';
import { isFirebaseConfigured, missingConfig } from './config/firebase';
import { useAuth } from './hooks/useAuth';
import { createSession } from './utils/sessions';
import { forgetSession, getRecentSessions } from './utils/storage';
import AttendanceDashboard from './components/AttendanceDashboard';
import AuthScreen from './components/AuthScreen';
import FilePreview from './components/FilePreview';
import Header from './components/Header';
import SetupNotice from './components/SetupNotice';
import UploadScreen from './components/UploadScreen';

function targetFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('session');
  return id ? { id, key: params.get('key') || '' } : null;
}

function setUrl(target) {
  const url = new URL(window.location.href);
  url.search = '';
  if (target) {
    url.searchParams.set('session', target.id);
    if (target.key) url.searchParams.set('key', target.key);
  }
  window.history.replaceState(null, '', url);
}

function AuthedApp() {
  const { user, ready, error, signInWithGoogle, signInAsGuest, logOut } = useAuth();
  const [target, setTarget] = useState(targetFromUrl);
  const [parsed, setParsed] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [, bump] = useState(0);

  const open = (next) => {
    setUrl(next);
    setTarget(next);
    setParsed(null);
  };
  const exit = () => {
    setUrl(null);
    setTarget(null);
  };
  const signOut = async () => {
    exit();
    setParsed(null);
    await logOut();
  };

  const start = async ({ name, date }) => {
    setCreating(true);
    setCreateError('');
    try {
      const { id, accessKey } = await createSession({ user, name, date, parsed });
      open({ id, key: accessKey });
    } catch {
      setCreateError('The session could not be created. Check your connection and that the Firestore rules are published.');
    } finally {
      setCreating(false);
    }
  };

  if (!ready) return <main className="panel panel--narrow"><p role="status">Loading…</p></main>;

  if (!user) {
    return (
      <>
        <Header />
        <AuthScreen error={error} onGoogle={signInWithGoogle} onGuest={signInAsGuest} />
      </>
    );
  }

  if (target) {
    return (
      <AttendanceDashboard
        user={user}
        sessionId={target.id}
        accessKey={target.key}
        onExit={exit}
        onNewUpload={exit}
        onSignOut={signOut}
      />
    );
  }

  return (
    <>
      <Header user={user} onSignOut={signOut} />
      {parsed ? (
        <FilePreview parsed={parsed} creating={creating} error={createError} onStart={start} onCancel={() => setParsed(null)} />
      ) : (
        <UploadScreen
          recent={getRecentSessions(user.uid)}
          onParsed={setParsed}
          onJoin={open}
          onForget={(id) => {
            forgetSession(id, user.uid);
            bump((n) => n + 1);
          }}
        />
      )}
    </>
  );
}

export default function App() {
  if (!isFirebaseConfigured) return <SetupNotice missing={missingConfig} />;
  return <AuthedApp />;
}
