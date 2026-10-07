import { useEffect, useRef } from 'react';

export default function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="overlay" onClick={onCancel}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-msg" onClick={(e) => e.stopPropagation()}>
        <h2 id="dlg-title">{title}</h2>
        <p id="dlg-msg">{message}</p>
        <div className="dialog__actions">
          <button type="button" ref={cancelRef} className="btn" onClick={onCancel}>Cancel</button>
          <button type="button" className={`btn ${danger ? 'btn--danger-solid' : 'btn--primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
