import { useNavigationTransitions } from './components/navigation/useNavigationTransitions.js';
import AccountDropdown from './components/navigation/AccountDropdown.jsx';
import { uploadedImage } from './components/media/imageUrls.js';
import AboutPage from './pages/about/AboutPage.jsx';
import { useEffect, useRef, useState } from 'react';
import HomePage from './pages/home/HomePage.jsx';
import AttractionsPage from './pages/attractions/AttractionsPage.jsx';
import AccountPage from './pages/authentication/AccountPage.jsx';
import AttractionDetailsPage from './pages/attraction-details/AttractionDetailsPage.jsx';
import AdminPage from './pages/admin/AdminPage.jsx';
import TripsPage from './pages/itineraries/TripsPage.jsx';
import ProfilePage from './pages/profile/ProfilePage.jsx';
import SavedPlacesPage from './pages/saved-places/SavedPlacesPage.jsx';
import { accountRequest } from './pages/authentication/accountLogic.js';
import PlannerPage from './pages/planner/PlannerPage.jsx';
import { hasPendingForm } from './pages/planner/plannerLogic.js';
import './App.css';


function currentPage() {
  const page = window.location.hash.slice(1);
  if (page.startsWith('reset-password')) return 'reset-password';
  const allowedPages = [
    'home', 'explore', 'planner', 'login', 'register',
    'trips', 'profile', 'saved-places', 'admin', 'about',
  ];

  if (page.startsWith('place/')) return page;

  return allowedPages.includes(page) ? page : 'home';
}

export default function App() {
  const [page, setPage] = useState(currentPage);
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [siteImages, setSiteImages] = useState({});

  // Prevent an older session check from overwriting a newer login.
  const sessionVersion = useRef(0);
  const returnAfterLogin = useRef(null);

  useNavigationTransitions(currentPage, setPage, setLogoutError);
  useEffect(() => {
    let active = true;
    const apply = data => {
      if (active) setSiteImages({ logoImage: data.logo || '', homepageBanner: data.hero || '', loginImage: data.account || '' });
    };
    const refresh = () => accountRequest('/site-images').then(apply).catch(() => {});
    const changed = event => event.detail ? apply(event.detail) : refresh();
    refresh();
    window.addEventListener('site-images-updated', changed);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.removeEventListener('site-images-updated', changed);
      window.removeEventListener('focus', refresh);
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
    window.location.hash = returnAfterLogin.current || (hasPendingForm() ? 'planner' : 'home');
    returnAfterLogin.current = null;
  }

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError('');

    try {
      await accountRequest('/auth/logout', {});

      sessionVersion.current += 1;
      setUser(null);
      try { sessionStorage.removeItem('lakbaynaga.itinerary.edit'); sessionStorage.removeItem('lakbaynaga.planner.pending'); } catch { /* browser storage unavailable */ }
      window.location.hash = 'home';
    } catch {
      setLogoutError('Could not log out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  }

  /* ── Logged-in guard: redirect guests away from private account pages ── */
  useEffect(() => {
    if (['trips', 'profile', 'saved-places'].includes(page) && currentPage() === page && !checkingSession && !user) {
      window.location.hash = 'login';
    }
  }, [page, user, checkingSession]);

  let content;

  if (page.startsWith('place/')) {
    content = (
      <AttractionDetailsPage
        key={page}
        attractionId={page.slice('place/'.length)}
        user={user}
        checkingSession={checkingSession}
        onNeedLogin={() => { returnAfterLogin.current = page; window.location.hash = 'login'; }}
      />
    );
  } else if (page === 'explore') {
    content = <AttractionsPage key={page} />;
  } else if (page === 'about') {
    content = <AboutPage />;
  } else if (page === 'planner') {
    content = <PlannerPage onNeedLogin={() => { window.location.hash = 'login'; }} />;
  } else if (page === 'login' || page === 'register' || page === 'reset-password') {
    content = (
      <AccountPage
        key={page}
        mode={page}
        onSuccess={signedIn}
        siteImages={{ account: siteImages.loginImage, logo: siteImages.logoImage }}
      />
    );
  } else if (page === 'trips') {
    content = user ? <TripsPage key={page} user={user} /> : null;
  } else if (page === 'profile') {
    content = user ? <ProfilePage key={page} user={user} onUpdate={setUser} /> : null;
  } else if (page === 'saved-places') {
    content = user ? <SavedPlacesPage key={page} user={user} /> : null;
  } else if (page === 'admin') {
    content = <AdminPage key={page} user={user} checkingSession={checkingSession} onLogout={logout} siteImages={siteImages} />;
  } else {
    content = (
      <main>
        <HomePage siteImages={siteImages} />
      </main>
    );
  }

  return (
    <div className="site-shell">
        {!['admin', 'login', 'register', 'reset-password'].includes(page) && <header className="site-header">
        <div className="site-header-inner">
          <a className="site-brand" href="#home">
            {uploadedImage(siteImages.logoImage) && <img src={uploadedImage(siteImages.logoImage)} alt="" />}
            <div className="site-brand-copy">
              <strong>LakbayNaga</strong>
              <small>Naga City &middot; Camarines Sur, Philippines</small>
            </div>
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

            <a href="#planner" aria-current={page === 'planner' ? 'page' : undefined}>
              Plan a trip
            </a>

            {checkingSession ? (
              <>
                <span className="site-session-status" role="status">
                  Checking session...
                </span>
                <a href="#about" aria-current={page === 'about' ? 'page' : undefined}>
                  About us
                </a>
              </>
            ) : user ? (
              <>
                <a
                  href="#trips"
                  aria-current={page === 'trips' ? 'page' : undefined}
                >
                  Saved trips
                </a>

                <a href="#about" aria-current={page === 'about' ? 'page' : undefined}>
                  About us
                </a>

                {user.role === 'admin' && (
                  <a
                    href="#admin"
                    aria-current={page === 'admin' ? 'page' : undefined}
                  >
                    Dashboard
                  </a>
                )}

                <AccountDropdown user={user} currentPage={page} onLogout={logout} disabled={loggingOut} />
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
                  className="site-signup-link"
                  aria-current={page === 'register' ? 'page' : undefined}
                >
                  Sign Up
                </a>

                <a href="#about" aria-current={page === 'about' ? 'page' : undefined}>
                  About us
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

      <div className="site-page-content">{content}</div>
      {(['home', 'explore', 'planner', 'trips', 'saved-places', 'about'].includes(page) || page.startsWith('place/')) && (
        <footer className="site-footer">
          <div className="site-footer-inner">
            <section>
              <h2>Explore Naga</h2>
              <p>Find places to visit in Naga City, plan your days, and keep your trips in one place.</p>
            </section>
            <nav aria-label="Explore links">
              <h2>Explore</h2>
              <a href="#explore">All attractions</a>
              <a href="#planner">Itinerary planner</a>
              <a href="#trips">Saved itineraries</a>
              <a href="#about" aria-current={page === 'about' ? 'page' : undefined}>About us</a>
            </nav>
            <section>
              <h2>City Tourism Office</h2>
              <p>City Hall Compound, J. Miranda Ave., Naga City</p>
            </section>
          </div>
          <div className="site-footer-stripe" aria-hidden="true"><span /><span /><span /><span /></div>
        </footer>
      )}
    </div>
  );
}
