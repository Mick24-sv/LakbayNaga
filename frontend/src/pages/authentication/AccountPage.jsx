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
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const [googleReady, setGoogleReady] = useState(false), [googleBusy, setGoogleBusy] = useState(false), [googleError, setGoogleError] = useState('');
  const [resetMode, setResetMode] = useState(false), [resetEmail, setResetEmail] = useState(''), [resetMessage, setResetMessage] = useState('');
  const [resetBusy, setResetBusy] = useState(false), [resetError, setResetError] = useState(''), [newPassword, setNewPassword] = useState('');
  const resetToken = new URLSearchParams(window.location.hash.split('?')[1] || '').get('token') || '';

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || isReset) return;
    let active = true;
    const initialize = () => {
      if (!active || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: async ({ credential }) => {
        setGoogleBusy(true); setGoogleError('');
        try { const data = await googleLogin(credential); if (!data?.user) throw new Error('Google sign-in did not return an account.'); onSuccessRef.current(data.user); }
        catch (err) { setGoogleError(err.message || 'Google sign-in failed.'); }
        finally { setGoogleBusy(false); }
      } });
      setGoogleReady(true);
    };
    if (window.google?.accounts?.id) initialize();
    else {
      let script = document.querySelector('script[data-google-identity]');
      if (!script) { script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true; script.dataset.googleIdentity = 'true'; document.head.appendChild(script); }
      script.addEventListener('load', initialize);
      return () => { active = false; script.removeEventListener('load', initialize); };
    }
    return () => { active = false; };
  }, [isReset]);

  async function requestReset(event) {
    event.preventDefault(); setResetBusy(true); setResetError(''); setResetMessage('');
    try { const result = await accountRequest('/auth/password-reset/request', { email: resetEmail }); setResetMessage(result.message); }
    catch (err) { setResetError(err.message); } finally { setResetBusy(false); }
  }
  async function finishReset(event) {
    event.preventDefault(); setResetBusy(true); setResetError('');
    try { const result = await accountRequest('/auth/password-reset/complete', { token: resetToken, password: newPassword }); setResetMessage(result.message); setNewPassword(''); }
    catch (err) { setResetError(err.message); } finally { setResetBusy(false); }
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
          <button type="button" className="account-google" disabled={!googleReady || googleBusy} aria-describedby="account-google-status" onClick={() => { setGoogleError(''); window.google?.accounts?.id.prompt(); }}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.6 0-4.81-1.76-5.6-4.12H3.05v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.93a6 6 0 0 1 0-3.86V7.48H3.05a10 10 0 0 0 0 9.04l3.35-2.59Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.51 3.82 1.51l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.95 5.48l3.35 2.59A5.99 5.99 0 0 1 12 5.95Z"/></svg>
            {googleBusy ? 'Signing in...' : 'Continue with Google'}
          </button>
          <p id="account-google-status" className="account-google-status" role={googleError ? 'alert' : undefined}>{googleError || (googleReady ? 'Sign in securely with your Google account.' : 'Google sign-in is not configured.')}</p>
          <p className="account-switch">{register ? 'Already have an account?' : 'New here?'}{' '}<a href={register ? '#login' : '#register'}>{register ? 'Log in' : 'Create an account'}</a></p>
          <a className="account-back" href="#home"><span aria-hidden="true">←</span> Back to LakbayNaga</a>
        </>}
      </div>
    </section>
    {accountImage && <aside className="account-image"><img src={accountImage} alt="Naga City" /><p>“Naga is where Bicol gathers — for faith, food, and the mountain air.”</p></aside>}
  </main>;
}
