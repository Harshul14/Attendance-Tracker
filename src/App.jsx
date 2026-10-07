import { useState } from 'react';
import { createSession } from './utils/sessions';
import { forgetSession, getOperator, getRecentSessions, setOperator } from './utils/storage';
import AttendanceDashboard from './components/AttendanceDashboard';
import FilePreview from './components/FilePreview';
import Header from './components/Header';
import UploadScreen from './components/UploadScreen';

function targetFromUrl() {
  const id = new URLSearchParams(window.location.search).get('session');
  const key = new URLSearchParams(window.location.hash.slice(1)).get('k');
  return id && key ? { id, key } : null;
}

function setUrl(target) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = target ? `k=${target.key}` : '';
  if (target) url.searchParams.set('session', target.id);
  window.history.replaceState(null, '', url);
}

export default function App() {
  const [target, setTarget] = useState(targetFromUrl);
  const [parsed, setParsed] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [operator, setOperatorState] = useState(getOperator);
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
  const changeOperator = (name) => {
    setOperatorState(name);
    setOperator(name);
  };

  const start = async ({ name, date }, local = false) => {
    setCreating(true);
    setCreateError('');
    try {
      open(await createSession({ operator: operator.trim() || getOperator(), name, date, parsed, local }));
    } catch (e) {
      setCreateError(`The session could not be created: ${e.message || 'unknown error'}.`);
    } finally {
      setCreating(false);
    }
  };

  if (target) {
    return (
      <AttendanceDashboard
        sessionId={target.id}
        accessKey={target.key}
        operator={operator.trim() || getOperator()}
        onExit={exit}
        onNewUpload={exit}
      />
    );
  }

  return (
    <>
      <Header />
      {parsed ? (
        <FilePreview parsed={parsed} creating={creating} error={createError} onStart={start} onStartLocal={(details) => start(details, true)} onCancel={() => setParsed(null)} />
      ) : (
        <UploadScreen
          recent={getRecentSessions()}
          operator={operator}
          onOperator={changeOperator}
          onParsed={setParsed}
          onJoin={open}
          onForget={(id) => {
            forgetSession(id);
            bump((n) => n + 1);
          }}
        />
      )}
    </>
  );
}
