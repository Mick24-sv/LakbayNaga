import { useEffect, useRef, useState } from 'react';
import PasswordInput from '../../components/forms/PasswordInput.jsx';
import { accountRequest, googleLogin, useAccountForm } from './accountLogic.js';
import './AccountPage.css';

export default function AccountPage({ mode = 'login', onSuccess, siteImages = {} }) {
  const register = mode === 'register';
  const isReset = mode === 'reset-password';
  const accountImage = typeof siteImages.account === 'string' && /^\/api\/images\/[a-f0-9]{32}$/.test(siteImages.account) ? siteImages.account : '';
  const logo = typeof siteImages.logo === 'string' && /^\/api\/images\/[a-f0-9]{32}$/.test(siteImages.logo) ? siteImages.logo : '';
  const { values, update, busy, error, submit } = useAccountForm(mode, onSuccess);
  const googleButtonRef = useRef(null);
  const googleLock = useRef(false);
  const resetLock = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const [googleReady, setGoogleReady] = useState(false), [googleBusy, setGoogleBusy] = useState(false), [googleError, setGoogleError] = useState('');
  const [resetMode, setResetMode] = useState(false), [resetEmail, setResetEmail] = useState(''), [resetMessage, setResetMessage] = useState('');
  const [resetBusy, setResetBusy] = useState(false), [resetError, setResetError] = useState(''), [newPassword, setNewPassword] = useState('');
  const resetToken = new URLSearchParams(window.location.hash.split('?')[1] || '').get('token') || '';

  useEffect(() => {
    if (!isReset || !resetToken) return;
    // The reset token is needed only for this page lifetime; remove it from the address bar/history.
    window.history.replaceState(null, '', window.location.pathname + window.location.search + '#reset-password');
  }, [isReset, resetToken]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    setGoogleReady(false);
    setGoogleError('');
    if (!clientId || isReset || resetMode) return;
    let active = true;
    const container = googleButtonRef.current;
    const failed = () => { if (active) setGoogleError('Google sign-in could not load. Check your connection and reload the page.'); };
    const initialize = () => {
      if (!active || !container || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: async ({ credential }) => {
        if (!active || googleLock.current) return;
        if (!credential) { setGoogleError('Google sign-in did not return a credential. Please try again.'); return; }
        googleLock.current = true;
        setGoogleBusy(true); setGoogleError('');
        try {
          const data = await googleLogin(credential);
          if (!data?.user) throw new Error('Google sign-in did not return an account.');
          if (active) onSuccessRef.current(data.user);
        } catch (err) { if (active) setGoogleError(err.message || 'Google sign-in failed.'); }
        finally { googleLock.current = false; if (active) setGoogleBusy(false); }
      } });
      container.replaceChildren();
      window.google.accounts.id.renderButton(container, {
        type: 'standard', theme: 'outline', size: 'large', text: 'continue_with',
        shape: 'rectangular', locale: 'en', width: Math.min(340, container.clientWidth || 340)
      });
      setGoogleReady(true);
    };
    let script = document.querySelector('script[data-google-identity]');
    if (window.google?.accounts?.id) initialize();
    else {
      if (!script) {
        script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client?hl=en';
        script.async = true; script.defer = true; script.dataset.googleIdentity = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', initialize);
      script.addEventListener('error', failed);
    }
    const timeout = window.setTimeout(() => { if (!window.google?.accounts?.id) failed(); }, 15000);
    return () => {
      active = false; window.clearTimeout(timeout);
      script?.removeEventListener('load', initialize); script?.removeEventListener('error', failed);
      container?.replaceChildren();
    };
  }, [isReset, resetMode]);

  async function requestReset(event) {
    event.preventDefault(); if (resetLock.current) return; resetLock.current = true; setResetBusy(true); setResetError(''); setResetMessage('');
    try { const result = await accountRequest('/auth/password-reset/request', { email: resetEmail }); setResetMessage(result.message); }
    catch (err) { setResetError(err.message || 'The request could not be completed. Please try again.'); } finally { resetLock.current = false; setResetBusy(false); }
  }
  async function finishReset(event) {
    event.preventDefault(); if (resetLock.current) return; resetLock.current = true; setResetBusy(true); setResetError('');
    try { const result = await accountRequest('/auth/password-reset/complete', { token: resetToken, password: newPassword }); setResetMessage(result.message); setNewPassword(''); }
    catch (err) { setResetError(err.message || 'The request could not be completed. Please try again.'); } finally { resetLock.current = false; setResetBusy(false); }
  }
  function field(name, label, autoComplete, maxLength) {
    return <div className="account-field"><label htmlFor={'account-' + name}>{label}</label><input id={'account-' + name} name={name} type={name === 'email' ? 'email' : 'text'} autoComplete={autoComplete} maxLength={maxLength} required value={values[name]} onChange={event => update(name, event.target.value)} /></div>;
  }

  return <main className={'account-page' + (accountImage ? ' has-image' : '')}>
    <section className="account-left">
      {!isReset && <a className="account-brand" href="#home">{logo && <img src={logo} alt="LakbayNaga logo" />}<b>LakbayNaga</b></a>}
      <div className="account-card">
        <h1>{isReset ? 'Reset your password' : resetMode ? 'Forgot your password?' : register ? 'Create your account' : 'Welcome back'}</h1>
        <p className="account-intro">{isReset ? 'Choose a new password for your account.' : resetMode ? 'Enter your email and we will send reset instructions if an account matches.' : register ? 'Save places and keep your plans in one place.' : 'Log in to view your saved trips.'}</p>
        {!isReset && error && !resetMode && <div className="account-error" role="alert">{error}</div>}
        {resetError && <div className="account-error" role="alert">{resetError}</div>}
        {resetMessage && <p role="status">{resetMessage}</p>}
        {isReset ? <>
          {!resetMessage && resetToken && <form onSubmit={finishReset}><PasswordInput label="New password" required minLength={12} maxLength={128} autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} /><p className="account-guidance">Use 12 to 128 characters.</p><button className="account-submit" disabled={resetBusy}>{resetBusy ? 'Updating...' : 'Update password'}</button></form>}
          {!resetToken && <p className="account-error" role="alert">This password reset link is invalid or expired.</p>}
          <a className="account-back" href="#login">Back to login</a>
        </> : resetMode ? <>
          <form onSubmit={requestReset}><div className="account-field"><label htmlFor="reset-email">Email</label><input id="reset-email" type="email" required maxLength={254} value={resetEmail} onChange={event => setResetEmail(event.target.value)} /></div><button className="account-submit" disabled={resetBusy}>{resetBusy ? 'Sending...' : 'Send reset link'}</button></form>
          <p><button type="button" className="text-button" onClick={() => { setResetMode(false); setResetMessage(''); }}>Back to login</button></p>
        </> : <>
          <form onSubmit={submit}><fieldset disabled={busy}><legend className="account-sr-only">{register ? 'Registration details' : 'Login details'}</legend>
            {register && <div className="account-name-row">{field('firstName', 'First name', 'given-name', 60)}{field('lastName', 'Last name', 'family-name', 60)}</div>}
            {field('email', 'Email', 'email', 254)}
            <PasswordInput name="password" label="Password" required autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 12 : undefined} maxLength={128} aria-describedby={register ? 'password-guidance' : undefined} value={values.password} onChange={event => update('password', event.target.value)} />
            {register && <p id="password-guidance" className="account-guidance">Use 12 to 128 characters.</p>}
            <button className="account-submit" type="submit">{busy ? register ? 'Creating account...' : 'Logging in...' : register ? 'Create account' : 'Log in'}</button>
          </fieldset></form>
          {!register && <p><button type="button" className="text-button" onClick={() => { setResetMode(true); setResetEmail(values.email); }}>Forgot password?</button></p>}
          <div className="account-divider"><span>or</span></div>
          <div className={'account-google-host' + (googleBusy || busy ? ' is-busy' : '')} aria-busy={googleBusy}>
            <div ref={googleButtonRef} />
          </div>
          <p id="account-google-status" className="account-google-status" role={googleError ? 'alert' : 'status'}>{googleError || (googleBusy ? 'Signing in...' : googleReady ? 'Sign in securely with your Google account.' : import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'Loading Google sign-in...' : 'Google sign-in is not configured.')}</p>
          <p className="account-switch">{register ? 'Already have an account?' : 'New here?'}{' '}<a href={register ? '#login' : '#register'}>{register ? 'Log in' : 'Create an account'}</a></p>
          <a className="account-back" href="#home"><span aria-hidden="true">←</span> Back to LakbayNaga</a>
        </>}
      </div>
    </section>
    {accountImage && <aside className="account-image"><img src={accountImage} alt="Naga City" /><p>“Naga is where Bicol gathers — for faith, food, and the mountain air.”</p></aside>}
  </main>;
}
