import { memo, useRef } from 'react';
import { NEXT_STATUS, STATUS_META } from '../utils/attendance';

const DOUBLE_TAP_GUARD_MS = 300;

function CandidateCard({ candidate, onCycle }) {
  const lastTap = useRef(0);
  const status = STATUS_META[candidate.attendance] ? candidate.attendance : 'unmarked';
  const meta = STATUS_META[status];

  const handleClick = () => {
    const now = Date.now();
    // Ignore an accidental double tap, but allow deliberate quick taps on different people.
    if (now - lastTap.current < DOUBLE_TAP_GUARD_MS) return;
    lastTap.current = now;
    onCycle(candidate);
  };

  return (
    <button
      type="button"
      className={`card card--${status}`}
      onClick={handleClick}
      aria-label={`${candidate.name}, ${meta.label}. Tap to mark ${STATUS_META[NEXT_STATUS[status]].label}.`}
    >
      <span className="card__icon" aria-hidden="true">{meta.icon}</span>
      <span className="card__text">
        <span className="card__name">{candidate.name}</span>
        <span className="card__status">{meta.label}{candidate.pending ? ' · saving…' : ''}</span>
      </span>
    </button>
  );
}

export default memo(CandidateCard);
