import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ConfirmDialog.css';

export default function ConfirmDialog({ title, description, name, confirmLabel, busy, busyLabel = 'Working...', error, onCancel, onConfirm }) {
  const dialog = useRef(null);
  const cancel = useRef(null);
  const shake = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    cancel.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      shake.current?.cancel();
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(<dialog ref={dialog} className="confirm-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={busy}
    onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}
    onClick={event => {
      const bounds = event.currentTarget.getBoundingClientRect();
      if (!busy && event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) {
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          shake.current?.cancel();
          shake.current = dialog.current.animate([
            { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' },
            { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' },
            { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }
          ], { duration: 360, easing: 'ease-in-out' });
        }
        cancel.current?.focus({ preventScroll: true });
      }
    }}>
    <div className="confirm-dialog-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h16v12H4zM3 4h18v4H3zM9 12h6" /></svg></div>
    <h2 id={titleId}>{title}</h2>
    <p id={descriptionId}>{description}</p>
    {name && <div className="confirm-dialog-item">{name}</div>}
    {error && <p className="confirm-dialog-error" role="alert">{error}</p>}
    <div className="confirm-dialog-actions">
      <button ref={cancel} className="confirm-dialog-cancel" type="button" disabled={busy} onClick={onCancel}>Cancel</button>
      <button className="confirm-dialog-submit" type="button" disabled={busy} onClick={onConfirm}>{busy ? busyLabel : confirmLabel}</button>
    </div>
  </dialog>, document.body);
}
