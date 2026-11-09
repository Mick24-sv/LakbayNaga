import { useEffect, useRef, useState } from 'react';
import HomePage from './pages/home/HomePage.jsx';
import AttractionsPage from './pages/attractions/AttractionsPage.jsx';
import AccountPage from './pages/authentication/AccountPage.jsx';
import AttractionDetailsPage from './pages/attraction-details/AttractionDetailsPage.jsx';
import AdminPage from './pages/admin/AdminPage.jsx';
import TripsPage from './pages/itineraries/TripsPage.jsx';
import ProfilePage from './pages/profile/ProfilePage.jsx';
import { accountRequest } from './pages/authentication/accountLogic.js';
import './App.css';


function currentPage() {
  const page = window.location.hash.slice(1);
  const allowedPages = ['home', 'explore', 'login', 'register', 'trips', 'profile', 'admin'];

  if (page.startsWith('place/')) return page;

  return allowedPages.includes(page) ? page : 'home';
}

export default function App() {
  const [page, setPage] = useState(currentPage);
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  // Prevent an older session check from overwriting a newer login.
  const sessionVersion = useRef(0);

  useEffect(() => {
    function navigate() {
      setPage(currentPage());
      setLogoutError('');
      window.scrollTo(0, 0);
    }

    window.addEventListener('hashchange', navigate);

    return () => {
      window.removeEventListener('hashchange', navigate);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const version = sessionVersion.current;

    accountRequest('/auth/me')
      .then(data => {
        if (active && version === sessionVersion.current) {
          setUser(data.user);
        }
      })
      .catch(() => {
        // Login and registration forms show request errors.
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function signedIn(account) {
    sessionVersion.current += 1;
    setUser(account);
    setCheckingSession(false);
    setLogoutError('');
    window.location.hash = 'home';
  }

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError('');

    try {
      await accountRequest('/auth/logout', {});

      sessionVersion.current += 1;
      setUser(null);
      window.location.hash = 'home';
    } catch {
      setLogoutError('Could not log out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  }

  /* ── Logged-in guard: redirect guests away from #trips / #profile ── */
  useEffect(() => {
    if ((page === 'trips' || page === 'profile') && !checkingSession && !user) {
      window.location.hash = 'login';
    }
  }, [page, user, checkingSession]);

  let content;

  if (page.startsWith('place/')) {
    content = (
      <AttractionDetailsPage
        key={page}
        attractionId={page.slice('place/'.length)}
      />
    );
  } else if (page === 'explore') {
    content = <AttractionsPage key={page} />;
  } else if (page === 'login' || page === 'register') {
    content = (
      <AccountPage
        key={page}
        mode={page}
        onSuccess={signedIn}
      />
    );
  } else if (page === 'trips') {
    content = user ? <TripsPage key={page} user={user} /> : null;
  } else if (page === 'profile') {
    content = user ? <ProfilePage key={page} user={user} onUpdate={setUser} /> : null;
  } else if (page === 'admin') {
    content = <AdminPage key={page} user={user} checkingSession={checkingSession} onLogout={logout} />;
  } else {
    content = (
      <main>
        <HomePage />
      </main>
    );
  }

  return (
    <>
      {page !== 'admin' && <header className="site-header">
        <div className="site-header-inner">
          <a className="site-brand" href="#home">
            LakbayNaga
          </a>

          <nav aria-label="Main navigation">
            <a
              href="#home"
              aria-current={page === 'home' ? 'page' : undefined}
            >
              Home
            </a>

            <a
              href="#explore"
              aria-current={
                page === 'explore' || page.startsWith('place/')
                ? 'page'
                : undefined
              }
            >
              Attractions
            </a>

            {checkingSession ? (
              <span className="site-session-status" role="status">
                Checking session...
              </span>
            ) : user ? (
              <>
                <a
                  href="#trips"
                  aria-current={page === 'trips' ? 'page' : undefined}
                >
                  My Trips
                </a>

                <a
                  href="#profile"
                  aria-current={page === 'profile' ? 'page' : undefined}
                >
                  Profile
                </a>

                {user.role === 'admin' && (
                  <a
                    href="#admin"
                    aria-current={page === 'admin' ? 'page' : undefined}
                  >
                    Admin
                  </a>
                )}

                <span className="site-account-name">
                  Hi, {user.firstName}
                </span>

                <button
                  type="button"
                  className="site-logout"
                  disabled={loggingOut}
                  onClick={logout}
                >
                  {loggingOut ? 'Logging out...' : 'Log out'}
                </button>
              </>
            ) : (
              <>
                <a
                  href="#login"
                  aria-current={page === 'login' ? 'page' : undefined}
                >
                  Log in
                </a>

                <a
                  href="#register"
                  aria-current={page === 'register' ? 'page' : undefined}
                >
                  Create account
                </a>
              </>
            )}
          </nav>
        </div>
      </header>}

      {logoutError && (
        <p className="site-account-error" role="alert">
          {logoutError}
        </p>
      )}

      {content}
    </>
  );
}
