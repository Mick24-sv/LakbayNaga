import PasswordInput from '../../components/forms/PasswordInput.jsx';
import { useAccountForm } from './accountLogic.js';
import './AccountPage.css';

export default function AccountPage({
  mode = 'login',
  onSuccess,
  siteImages = {}
}) {
  const register = mode === 'register';
  const accountImage = typeof siteImages.account === 'string' && /^\/api\/images\/[a-f0-9]{32}$/.test(siteImages.account) ? siteImages.account : '';
  const logo = typeof siteImages.logo === 'string' && /^\/api\/images\/[a-f0-9]{32}$/.test(siteImages.logo) ? siteImages.logo : '';

  const {
    values,
    update,
    busy,
    error,
    submit
  } = useAccountForm(mode, onSuccess);

  function field(name, label, autoComplete, maxLength) {
    return (
      <div className="account-field">
        <label htmlFor={'account-' + name}>{label}</label>

        <input
          id={'account-' + name}
          name={name}
          type={name === 'email' ? 'email' : 'text'}
          autoComplete={autoComplete}
          maxLength={maxLength}
          required
          value={values[name]}
          onChange={event => update(name, event.target.value)}
        />
      </div>
    );
  }

  return (
    <main className={'account-page' + (accountImage ? ' has-image' : '')}>
      <section className="account-left">
        <a className="account-brand" href="#home">
          {logo && <img src={logo} alt="LakbayNaga logo" />}
          <b>LakbayNaga</b>
        </a>

        <div className="account-card">

        <h1>{register ? 'Create your account' : 'Welcome back'}</h1>

        <p className="account-intro">
          {register
            ? 'Save places and keep your plans in one place.'
            : 'Log in to view your saved trips.'}
        </p>

        {error && (
          <div className="account-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            <legend className="account-sr-only">
              {register ? 'Registration details' : 'Login details'}
            </legend>

            {register && (
              <div className="account-name-row">
                {field('firstName', 'First name', 'given-name', 60)}
                {field('lastName', 'Last name', 'family-name', 60)}
              </div>
            )}

            {field('email', 'Email', 'email', 254)}

            <PasswordInput
              name="password"
              label="Password"
              required
              autoComplete={register ? 'new-password' : 'current-password'}
              minLength={register ? 12 : undefined}
              maxLength={128}
              aria-describedby={register ? 'password-guidance' : undefined}
              value={values.password}
              onChange={event => update('password', event.target.value)}
            />

            {register && (
              <p id="password-guidance" className="account-guidance">
                Use 12 to 128 characters.
              </p>
            )}

            <button className="account-submit" type="submit">
              {busy
                ? register ? 'Creating account...' : 'Logging in...'
                : register ? 'Create account' : 'Log in'}
            </button>
          </fieldset>

          <span className="account-sr-only" role="status">
            {busy
              ? register ? 'Creating your account.' : 'Logging in.'
              : ''}
          </span>
        </form>

        <div className="account-divider"><span>or</span></div>
        <button type="button" className="account-google" disabled aria-describedby="account-google-status">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.6 0-4.81-1.76-5.6-4.12H3.05v2.59A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.4 13.93a6 6 0 0 1 0-3.86V7.48H3.05a10 10 0 0 0 0 9.04l3.35-2.59Z" />
            <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.51 3.82 1.51l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.95 5.48l3.35 2.59A5.99 5.99 0 0 1 12 5.95Z" />
          </svg>
          Continue with Google
        </button>
        <p id="account-google-status" className="account-google-status">Google sign-in is currently unavailable.</p>

        <p className="account-switch">
          {register ? 'Already have an account?' : 'New here?'}{' '}
          <a href={register ? '#login' : '#register'}>
            {register ? 'Log in' : 'Create an account'}
          </a>
        </p>

        <a className="account-back" href="#home">
          <span aria-hidden="true">&#8592;</span> Back to LakbayNaga
        </a>
        </div>
      </section>
      {accountImage && (
        <aside className="account-image">
          <img src={accountImage} alt="Naga City" />
          <p>&ldquo;Naga is where Bicol gathers &mdash; for faith, food, and the mountain air.&rdquo;</p>
        </aside>
      )}
    </main>
  );
}