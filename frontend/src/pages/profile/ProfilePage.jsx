import { useRef, useState } from 'react';
import PasswordInput from '../../components/forms/PasswordInput.jsx';
import './ProfilePage.css';

export default function ProfilePage({ user, onUpdate }) {
  const [names, setNames] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
  });
  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [error, setError] = useState('');

  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const lock = useRef(false);

  async function save(event, type) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true; setBusy(type); setError(''); setMessage('');
    try {
      const response = await fetch(type === 'profile' ? '/api/profile' : '/api/profile/password', {
        method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type === 'profile' ? names : { currentPassword: passwords.current, newPassword: passwords.next })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save your changes.');
      if (!data.user) throw new Error('The server did not return your account.');
      onUpdate?.(data.user);
      setNames({ firstName: data.user.firstName, lastName: data.user.lastName });
      if (type === 'password') setPasswords({ current: '', next: '' });
      setMessage(type === 'profile' ? 'Your profile was updated.' : 'Your password was updated. Other sessions have been signed out.');
    } catch (error) { setError(error.message || 'Unable to connect. Try again.'); }
    finally { lock.current = false; setBusy(''); }
  }

  return (
    <main className="profile-page">
      <div className="profile-container">
        <header className="profile-heading">
          <div className="profile-eyebrow">YOUR ACCOUNT</div>
          <h1>My profile</h1>
          <p>Keep your details up to date.</p>
        </header>

        {error && <p className="profile-feedback" role="alert">{error}</p>}
        {message && <p className="profile-feedback profile-success" role="status">{message}</p>}

        <div className="profile-grid">
          <form className="profile-panel" onSubmit={event => save(event, 'profile')} aria-labelledby="profile-personal-heading">
            <fieldset className="profile-fields" disabled={Boolean(busy)}>
            <h2 id="profile-personal-heading">Personal information</h2>
            <div className="profile-row">
              <label>
                First name
                <input required maxLength={60} autoComplete="given-name"
                  value={names.firstName}
                  onChange={event => setNames(current => ({ ...current, firstName: event.target.value }))} />
              </label>
              <label>
                Last name
                <input required maxLength={60} autoComplete="family-name"
                  value={names.lastName}
                  onChange={event => setNames(current => ({ ...current, lastName: event.target.value }))} />
              </label>
            </div>
            <label>
              Email
              <input type="email" readOnly value={user?.email ?? ''} autoComplete="email" />
            </label>
            <button className="profile-primary" type="submit">{busy === 'profile' ? 'Saving...' : 'Save profile'}</button>
            </fieldset>
          </form>

          <form className="profile-panel" onSubmit={event => save(event, 'password')} aria-labelledby="profile-password-heading">
            <fieldset className="profile-fields" disabled={Boolean(busy)}>
            <h2 id="profile-password-heading">Change password</h2>
            <PasswordInput label="Current password" required maxLength={128}
              autoComplete="current-password" value={passwords.current}
              onChange={event => setPasswords(current => ({ ...current, current: event.target.value }))} />
            <PasswordInput label="New password" required minLength={12} maxLength={128}
              autoComplete="new-password" value={passwords.next}
              onChange={event => setPasswords(current => ({ ...current, next: event.target.value }))} />
            <p className="profile-hint">Use 12&#8211;128 characters.</p>
            <button className="profile-primary" type="submit">{busy === 'password' ? 'Updating...' : 'Update password'}</button>
            </fieldset>
          </form>
        </div>
      </div>
    </main>
  );
}
