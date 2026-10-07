import { useEffect, useRef, useState } from 'react';

export default function ShareDialog({ url, onClose }) {
  const inputRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    inputRef.current?.select();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      inputRef.current?.select();
      document.execCommand('copy');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="share-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="share-title">Share Session</h2>
        <p>Anyone with this link who signs in can view and mark attendance. Share it only with your team.</p>
        <input ref={inputRef} className="input" readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Session link" />
        <div className="dialog__actions">
          <button type="button" className="btn" onClick={onClose}>Close</button>
          <button type="button" className="btn btn--primary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button>
        </div>
      </div>
    </div>
  );
}
