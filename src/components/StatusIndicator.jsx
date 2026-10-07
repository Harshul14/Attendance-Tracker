const LABELS = { live: 'Live', syncing: 'Syncing…', offline: 'Offline' };

export default function StatusIndicator({ connection }) {
  const { state, pending } = connection;
  const extra = pending > 0 ? ` · ${pending} queued` : '';
  return (
    <span className={`status status--${state}`} role="status" aria-live="polite">
      <span className="status__dot" aria-hidden="true" />
      {LABELS[state]}
      {extra}
    </span>
  );
}
