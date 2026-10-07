import { useCallback, useMemo, useRef, useState } from 'react';
import { useLiveSession } from '../hooks/useLiveSession';
import { NEXT_STATUS, computeStats, filterCandidates } from '../utils/attendance';
import { exportAttendance } from '../utils/export';
import { isLocalId } from '../utils/remote';
import { sessionLink } from '../utils/sessions';
import CandidateList from './CandidateList';
import ConfirmDialog from './ConfirmDialog';
import Header from './Header';
import ShareDialog from './ShareDialog';
import SummaryCards from './SummaryCards';
import Toolbar from './Toolbar';

export default function AttendanceDashboard({ sessionId, accessKey, operator, onExit, onNewUpload }) {
  const { phase, error, session, candidates, connection, apply } = useLiveSession(sessionId, accessKey, operator);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [dialog, setDialog] = useState(null); // 'reset' | 'present' | 'absent' | 'share'
  const [notice, setNotice] = useState('');
  const undoStack = useRef([]);
  const [canUndo, setCanUndo] = useState(false);

  const pushUndo = useCallback((entry) => {
    undoStack.current = [...undoStack.current.slice(-49), entry];
    setCanUndo(true);
  }, []);

  const cycle = useCallback(
    (candidate) => {
      pushUndo([{ id: candidate.id, status: candidate.attendance }]);
      apply([{ id: candidate.id, status: NEXT_STATUS[candidate.attendance] || 'present' }]);
    },
    [apply, pushUndo],
  );

  const undo = () => {
    const entry = undoStack.current.pop();
    setCanUndo(undoStack.current.length > 0);
    if (entry) apply(entry);
  };

  const groups = session?.groups ?? [];
  const stats = useMemo(() => computeStats(candidates, groups), [candidates, groups]);
  const visible = useMemo(() => filterCandidates(candidates, query, filter), [candidates, query, filter]);
  const visibleByGroup = useMemo(
    () => Object.fromEntries(groups.map((g) => [g, visible.filter((c) => c.group === g)])),
    [visible, groups],
  );
  const shownGroups = tab === 'all' ? groups : groups.filter((g) => g === tab);
  const shownCount = shownGroups.reduce((n, g) => n + visibleByGroup[g].length, 0);

  const bulkMark = (status) => {
    const targets = shownGroups.flatMap((g) => visibleByGroup[g]).filter((c) => c.attendance !== status);
    pushUndo(targets.map((c) => ({ id: c.id, status: c.attendance })));
    apply(targets.map((c) => ({ id: c.id, status })));
    setDialog(null);
  };

  const resetAll = () => {
    undoStack.current = [];
    setCanUndo(false);
    apply(candidates.filter((c) => c.attendance !== 'unmarked').map((c) => ({ id: c.id, status: 'unmarked' })));
    setDialog(null);
  };

  const handleExport = () => {
    try {
      exportAttendance(session, candidates);
    } catch {
      setNotice('The Excel file could not be created.');
      setTimeout(() => setNotice(''), 4000);
    }
  };

  if (phase === 'error') {
    return (
      <>
        <Header />
        <main className="panel panel--narrow">
          <h2>Cannot open session</h2>
          <p className="alert alert--error" role="alert">{error}</p>
          <button type="button" className="btn btn--primary" onClick={onExit}>Back to start</button>
        </main>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Header />
        <main className="panel panel--narrow"><p role="status">Opening session…</p></main>
      </>
    );
  }

  const bulkLabel = dialog === 'present' ? 'Present' : 'Absent';

  return (
    <>
      <Header session={session} total={stats.total} connection={connection} localOnly={isLocalId(sessionId)} onShare={() => setDialog('share')} />
      <div className="sticky">
        <SummaryCards stats={stats} />
      </div>
      <Toolbar
        query={query} onQuery={setQuery} filter={filter} onFilter={setFilter}
        tabs={['all', ...groups]} tab={tab} onTab={setTab}
        canUndo={canUndo} onUndo={undo} onNewUpload={onNewUpload} onExport={handleExport}
        onReset={() => setDialog('reset')} onMarkVisible={setDialog} visibleCount={shownCount}
      />
      {notice && <p className="alert alert--error" role="alert">{notice}</p>}
      <main className={`lists ${shownGroups.length > 1 ? 'lists--two' : ''}`}>
        {shownGroups.map((g) => (
          <CandidateList key={g} group={g} candidates={visibleByGroup[g]} counts={stats.byGroup[g]} onCycle={cycle} />
        ))}
      </main>

      {dialog === 'reset' && (
        <ConfirmDialog title="Reset attendance" message="Are you sure you want to reset all attendance? This clears it for everyone in this session." confirmLabel="Reset" danger onConfirm={resetAll} onCancel={() => setDialog(null)} />
      )}
      {(dialog === 'present' || dialog === 'absent') && (
        <ConfirmDialog title={`Mark ${shownCount} visible as ${bulkLabel}?`} message="Only the candidates currently shown (after search, filter and tab) will change." confirmLabel={`Mark ${bulkLabel}`} onConfirm={() => bulkMark(dialog)} onCancel={() => setDialog(null)} />
      )}
      {dialog === 'share' && <ShareDialog url={sessionLink(sessionId, accessKey)} onClose={() => setDialog(null)} />}
    </>
  );
}
