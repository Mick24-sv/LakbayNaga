import PasswordInput from '../../components/forms/PasswordInput.jsx';
import { useAccountForm } from './accountLogic.js';
import './AccountPage.css';

export default function AccountPage({
  mode = 'login',
  onSuccess
}) {
  const register = mode === 'register';

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
    <main className="account-page">
      <section className="account-card">
        <a className="account-brand" href="#home">
          LakbayNaga
        </a>

        <h1>{register ? 'Create your account' : 'Welcome back'}</h1>

        <p className="account-intro">
          {register
            ? 'Create an account to start planning your Naga visits.'
            : 'Log in to continue planning your Naga visits.'}
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

        <p className="account-switch">
          {register ? 'Already have an account?' : 'New here?'}{' '}
          <a href={register ? '#login' : '#register'}>
            {register ? 'Log in' : 'Create an account'}
          </a>
        </p>

        <a className="account-back" href="#home">
          Back to LakbayNaga
        </a>
      </section>
    </main>
  );
}