import { useState } from 'react';
import PasswordInput from '../../components/forms/PasswordInput.jsx';
import './ProfilePage.css';

export default function ProfilePage({ user }) {
  const [names, setNames] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
  });
  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [error, setError] = useState('');

  function saveProfile(event) {
    event.preventDefault();
    setError('Profile editing is not available yet. No changes were saved.');
  }

  function savePassword(event) {
    event.preventDefault();
    setError('Password changes are not available yet. Your password has not changed.');
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

        <div className="profile-grid">
          <form className="profile-panel" onSubmit={saveProfile} aria-labelledby="profile-personal-heading">
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
            <button className="profile-primary" type="submit">Save profile</button>
          </form>

          <form className="profile-panel" onSubmit={savePassword} aria-labelledby="profile-password-heading">
            <h2 id="profile-password-heading">Change password</h2>
            <PasswordInput label="Current password" required maxLength={128}
              autoComplete="current-password" value={passwords.current}
              onChange={event => setPasswords(current => ({ ...current, current: event.target.value }))} />
            <PasswordInput label="New password" required minLength={12} maxLength={128}
              autoComplete="new-password" value={passwords.next}
              onChange={event => setPasswords(current => ({ ...current, next: event.target.value }))} />
            <p className="profile-hint">Use 12&#8211;128 characters.</p>
            <button className="profile-primary" type="submit">Update password</button>
          </form>
        </div>
      </div>
    </main>
  );
}
