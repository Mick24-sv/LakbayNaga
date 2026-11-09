import { useState } from 'react';
import './ProfilePage.css';

export default function ProfilePage({ user, onUpdate }) {
  const [tab, setTab] = useState('profile');

  /* ── Profile form state ── */
  const [profile, setProfile] = useState({
    firstName: user?.firstName ?? '',
    lastName:  user?.lastName  ?? '',
    email:     user?.email     ?? '',
  });
  const [profileMsg, setProfileMsg] = useState('');

  /* ── Password form state ── */
  const [passwords, setPasswords] = useState({
    current: '',
    next:    '',
    confirm: '',
  });
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');

  /* ── Handlers ── */
  function handleProfileSave(e) {
    e.preventDefault();
    // Optimistically update the parent's user state (name shown in nav).
    if (onUpdate) onUpdate(prev => ({ ...prev, ...profile }));
    setProfileMsg('Profile updated!');
    setTimeout(() => setProfileMsg(''), 3000);
  }

  function handlePasswordSave(e) {
    e.preventDefault();
    setPasswordError('');
    if (passwords.next.length < 12) {
      setPasswordError('New password must be at least 12 characters.');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordError('New passwords do not match.');
      return;
    }
    // Frontend only — just show success message.
    setPasswords({ current: '', next: '', confirm: '' });
    setPasswordMsg('Password updated!');
    setTimeout(() => setPasswordMsg(''), 3000);
  }

  /* ── Avatar initials ── */
  const initials = [profile.firstName[0], profile.lastName[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || '?';

  return (
    <main className="profile-page">
      <div className="profile-container">
        {/* Header */}
        <div className="profile-header">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">{initials}</div>
          </div>
          <div>
            <p className="profile-eyebrow">Account</p>
            <h1>{profile.firstName} {profile.lastName}</h1>
            <p className="profile-email">{profile.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'profile'}
            className={tab === 'profile' ? 'profile-tab active' : 'profile-tab'}
            onClick={() => setTab('profile')}
          >
            Profile
          </button>
          <button
            role="tab"
            aria-selected={tab === 'password'}
            className={tab === 'password' ? 'profile-tab active' : 'profile-tab'}
            onClick={() => setTab('password')}
          >
            Password
          </button>
        </div>

        {/* ── Profile tab ── */}
        {tab === 'profile' && (
          <form className="profile-form panel" onSubmit={handleProfileSave}>
            <h2 className="profile-section-heading">Personal Information</h2>

            <div className="profile-row">
              <label className="profile-label">
                First name
                <input
                  className="profile-input"
                  type="text"
                  maxLength={60}
                  required
                  value={profile.firstName}
                  onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))}
                />
              </label>
              <label className="profile-label">
                Last name
                <input
                  className="profile-input"
                  type="text"
                  maxLength={60}
                  required
                  value={profile.lastName}
                  onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))}
                />
              </label>
            </div>

            <label className="profile-label">
              Email address
              <input
                className="profile-input"
                type="email"
                maxLength={254}
                required
                value={profile.email}
                onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
              />
            </label>

            <div className="profile-form-footer">
              {profileMsg && (
                <p className="profile-success" role="status">{profileMsg}</p>
              )}
              <button type="submit" className="profile-submit">
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* ── Password tab ── */}
        {tab === 'password' && (
          <form className="profile-form panel" onSubmit={handlePasswordSave}>
            <h2 className="profile-section-heading">Change Password</h2>

            <label className="profile-label">
              Current password
              <input
                className="profile-input"
                type="password"
                autoComplete="current-password"
                required
                value={passwords.current}
                onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
              />
            </label>

            <label className="profile-label">
              New password
              <input
                className="profile-input"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                value={passwords.next}
                onChange={e => setPasswords(p => ({ ...p, next: e.target.value }))}
              />
              <span className="profile-hint">At least 12 characters.</span>
            </label>

            <label className="profile-label">
              Confirm new password
              <input
                className="profile-input"
                type="password"
                autoComplete="new-password"
                required
                value={passwords.confirm}
                onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
              />
            </label>

            {passwordError && (
              <p className="profile-error" role="alert">{passwordError}</p>
            )}

            <div className="profile-form-footer">
              {passwordMsg && (
                <p className="profile-success" role="status">{passwordMsg}</p>
              )}
              <button type="submit" className="profile-submit">
                Update Password
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
