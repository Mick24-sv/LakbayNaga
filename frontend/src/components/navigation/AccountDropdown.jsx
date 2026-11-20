import { useEffect, useId, useRef, useState } from 'react';
import './AccountDropdown.css';

export default function AccountDropdown({ user, onLogout, disabled = false, currentPage }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');
  const root = useRef(null);
  const trigger = useRef(null);
  const lock = useRef(false);
  const panelId = useId();
  useEffect(() => {
    if (!open) return;
    function outside(event) { if (!root.current?.contains(event.target)) setOpen(false); }
    function escape(event) { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  useEffect(() => { setOpen(false); setError(''); }, [currentPage]);
  async function logout() {
    if (lock.current || disabled) return;
    lock.current = true; setLoggingOut(true); setError('');
    try { await onLogout(); }
    catch { setError('Could not log out. Please try again.'); }
    finally { lock.current = false; setLoggingOut(false); }
  }
  return <div className="account-dropdown" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className="account-dropdown-trigger" aria-expanded={open} aria-controls={panelId} aria-label={'Account options for ' + (user.firstName || 'your account')} onClick={() => setOpen(value => !value)}>
      <span className="account-dropdown-avatar" aria-hidden="true">{(user.firstName || 'U').slice(0, 1).toUpperCase()}</span>
      <span className="account-dropdown-copy"><strong>{user.firstName || 'My account'}</strong><small>{user.role === 'admin' ? 'Administrator' : 'Tourist'}</small></span>
      <svg className="account-dropdown-chevron" width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 7 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    {open && <div className="account-dropdown-panel" id={panelId}>
      <p className="account-dropdown-caption">Your account</p>
      <a href="#profile" aria-current={currentPage === 'profile' ? 'page' : undefined} onClick={() => setOpen(false)}>My profile <span aria-hidden="true">&#8599;</span></a>
      <button type="button" disabled={disabled || loggingOut} onClick={logout}>{loggingOut ? 'Logging out...' : 'Log out'}</button>
      {error && <p className="account-dropdown-error" role="alert">{error}</p>}
    </div>}
  </div>;
}
