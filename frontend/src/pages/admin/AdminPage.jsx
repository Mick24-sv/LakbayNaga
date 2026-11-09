import { useEffect, useRef, useState } from 'react';
import RouteMap from '../../components/maps/RouteMap.jsx';
import {
  adminCategories,
  adminRequest,
  validateAttractionForm,
} from './adminLogic.js';
import './AdminPage.css';

/* ── helpers ─────────────────────────────────────────────── */
async function api(path, body, method) {
  return adminRequest(path, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    ...(body === undefined ? {} : { body }),
  });
}

function money(n) {
  return '₱' + Number(n).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/* ── constants ───────────────────────────────────────────── */
const EMPTY = {
  name: '',
  category: 'Faith & heritage',
  area: '',
  description: '',
  cost: 0,
  duration: 60,
  openingHours: '',
  featured: false,
  published: false,
  lat: '',
  lng: '',
};

const NAV = [
  ['dashboard',    'Dashboard'],
  ['attractions',  'Attractions'],
];

/* ── component ───────────────────────────────────────────── */
export default function Admin({ user, checkingSession, onChanged, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [section,  setSection]  = useState('dashboard');
  const [places,   setPlaces]   = useState([]);
  const [edit,     setEdit]     = useState(null);
  const [error,    setError]    = useState('');
  const [loadError, setLoadError] = useState('');
  const [message,  setMessage]  = useState('');
  const [busy,     setBusy]     = useState(false);
  const [search,   setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const saveLock = useRef(false);

  /* load attractions */
  async function load() {
    setLoading(true);
    setError('');
    setLoadError('');
    try {
      setPlaces(await api('/admin/attractions'));
    } catch (e) {
      setError(e.message);
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') load();
  }, [user]);

  /* helpers */
  const set = (key, value) => {
    setEdit(s => ({ ...s, [key]: value }));
    setError('');
  };

  function navigate(next) {
    setSection(next);
    setMenuOpen(false);
    setEdit(null);
    setError('');
    setMessage('');
  }

  function startEdit(place) {
    setEdit({ ...EMPTY, ...place });
    setSection('attractions');
    setMenuOpen(false);
    setError('');
    setMessage('');
  }

  /* save attraction */
  async function save(e) {
    e.preventDefault();
    if (saveLock.current) return;
    const validation = validateAttractionForm(edit);
    if (Object.keys(validation).length) {
      setError(Object.values(validation).join(' '));
      return;
    }
    saveLock.current = true;
    setBusy(true);
    setError('');
    try {
      await api(
        '/admin/attractions' + (edit.id ? '/' + edit.id : ''),
        edit,
        edit.id ? 'PUT' : 'POST',
      );
      await load();
      await onChanged?.();
      setEdit(null);
      setMessage('Attraction saved. Published changes are now visible in Explore.');
    } catch (err) {
      setError(err.message);
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  }

  async function publish(a) {
    if (a.archived) return;
    setError('');
    try {
      await api('/admin/attractions/' + encodeURIComponent(a.id) + '/publish', {
        published: !a.published,
      }, 'PATCH');
      await load();
      await onChanged?.();
      setMessage(a.published ? 'Attraction unpublished.' : 'Attraction published and visible in Explore.');
    } catch (err) {
      setError(err.message);
    }
  }

  /* archive / restore */
  async function archive(a) {
    if (!a.archived && !window.confirm('Archive this attraction? It will disappear from public browsing.')) return;
    setError('');
    try {
      await api('/admin/attractions/' + encodeURIComponent(a.id) + '/archive', { archived: !a.archived }, 'PATCH');
      await load();
      await onChanged?.();
      setMessage(
        a.archived
          ? 'Attraction restored as a draft. Edit it to publish.'
          : 'Attraction archived. Existing saved itineraries are retained.',
      );
    } catch (err) {
      setError(err.message);
    }
  }

  /* access guards */
  if (checkingSession) return <div className="empty" role="status">Checking your session…</div>;

  if (!user) return (
    <div className="empty">
      <h1>Administrator login</h1>
      <p>Log in with your administrator account to continue.</p>
      <a className="primary" href="#login">Log in</a>
    </div>
  );

  if (user.role !== 'admin') return (
    <div className="empty">
      <h1>Administrator access required</h1>
      <p>This account has tourist access.</p>
      <a className="outline" href="#home">Back to Home</a>
    </div>
  );

  const filtered = places.filter(a => {
    const matchesSearch = [a.name, a.category].some(value =>
      String(value || '').toLowerCase().includes(search.trim().toLowerCase()),
    );
    const itemStatus = a.archived ? 'archived' : a.published ? 'published' : 'draft';
    return matchesSearch && (statusFilter === 'all' || itemStatus === statusFilter);
  });

  /* ── render ───────────────────────────────────────────── */
  return (
    <div className={'admin-shell admin-workspace' + (menuOpen ? ' menu-open' : '')}>

      {/* ── sidebar ── */}
      <aside className="admin-sidebar" id="admin-navigation">
        <a className="admin-wordmark" href="#home">
          <div>
            LakbayNaga
            <span>Administration</span>
          </div>
        </a>

        <span className="admin-nav-label">Workspace</span>

        <nav aria-label="Administration">
          {NAV.map(([key, label]) => (
            <button
              key={key}
              className={section === key ? 'active' : ''}
              aria-current={section === key ? 'page' : undefined}
              onClick={() => navigate(key)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <span>Content management</span>
          <p>Places and visitor information.</p>
        </div>
      </aside>

      {/* ── main content ── */}
      <section className="admin-content">

        {/* topbar */}
        <div className="admin-topbar">
          <button
            type="button"
            className="admin-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="admin-navigation"
            onClick={() => setMenuOpen(v => !v)}
          >
            {menuOpen ? 'Close menu' : 'Menu'}
          </button>

          <span className="admin-topbar-label">Admin workspace</span>

          <div className="admin-topbar-actions">
            <a href="#home">View website &#8599;</a>

            <span className="admin-account">
              <span className="admin-avatar" aria-hidden="true">
                {(user.firstName || 'A').slice(0, 1).toUpperCase()}
              </span>
              <span>
                {user.firstName || 'Administrator'}
                <small>Administrator</small>
              </span>
            </span>

            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={async () => {
                setError('');
                try { await onLogout?.(); }
                catch (err) { setError(err.message); }
              }}
            >
              Log out
            </button>
          </div>
        </div>

        {/* page body */}
        <div className="admin-page-body">

          {/* page header */}
          <div className="admin-page-header">
            <div>
              <p className="admin-eyebrow">Manage your website</p>
              <h1>
                {edit
                  ? (edit.id ? 'Edit attraction' : 'Add attraction')
                  : section === 'attractions' ? 'Attractions'
                  : 'Dashboard'}
              </h1>
              <p className="admin-description">
                {edit
                  ? 'Keep place details and visitor information up to date.'
                  : section === 'attractions'
                  ? 'Manage the places visitors can discover and plan to visit.'
                  : 'An overview of your attractions and publishing status.'}
              </p>
            </div>

            {edit && (
              <button className="outline" onClick={() => navigate('attractions')}>
                Back to attractions
              </button>
            )}
          </div>

          {/* alerts */}
          {error && (
            <p className="alert" role="alert">
              {error}
              {loadError && <button type="button" onClick={load}>Try again</button>}
            </p>
          )}
          {message && <p className="notice" role="status" >{message}</p>}

          {/* ── editor ── */}
          {edit ? (
            <form onSubmit={save} className="admin-editor">

              {/* left column */}
              <div>
                <div className="panel">
                  <h3>Basic details</h3>

                  <label>
                    Name
                    <input
                      required
                      maxLength="120"
                      value={edit.name}
                      onChange={e => set('name', e.target.value)}
                    />
                  </label>

                  <label>
                    Category
                    <select
                      value={edit.category}
                      onChange={e => set('category', e.target.value)}
                    >
                      {adminCategories.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </label>

                  <label>
                    Description
                    <textarea
                      required
                      maxLength="1200"
                      value={edit.description}
                      onChange={e => set('description', e.target.value)}
                    />
                  </label>
                </div>

                <div className="panel">
                  <h3>Location &amp; fees</h3>

                  <label>
                    Address / area
                    <input
                      required
                      maxLength="200"
                      value={edit.area}
                      onChange={e => set('area', e.target.value)}
                    />
                  </label>

                  <div className="row">
                    <label>
                      Entrance fee per person (₱)
                      <input
                        required
                        type="number"
                        min="0"
                        max="100000"
                        step=".01"
                        value={edit.cost}
                        onChange={e => set('cost', e.target.value)}
                      />
                    </label>
                    <label>
                      Visit duration (minutes)
                      <input
                        required
                        type="number"
                        min="15"
                        max="480"
                        value={edit.duration}
                        onChange={e => set('duration', e.target.value)}
                      />
                    </label>
                  </div>

                  <label>
                    Opening hours / visitor note
                    <input
                      maxLength="200"
                      value={edit.openingHours}
                      onChange={e => set('openingHours', e.target.value)}
                    />
                  </label>

                  <div className="row">
                    <label>
                      Latitude
                      <input
                        type="number"
                        step="any"
                        min="-90"
                        max="90"
                        value={edit.lat ?? ''}
                        onChange={e => set('lat', e.target.value)}
                      />
                    </label>
                    <label>
                      Longitude
                      <input
                        type="number"
                        step="any"
                        min="-180"
                        max="180"
                        value={edit.lng ?? ''}
                        onChange={e => set('lng', e.target.value)}
                      />
                    </label>
                  </div>

                  <RouteMap
                    stops={
                      edit.lat !== '' && edit.lat != null &&
                      edit.lng !== '' && edit.lng != null
                        ? [{ id: edit.id || 'new', name: edit.name || 'New attraction', lat: Number(edit.lat), lng: Number(edit.lng) }]
                        : []
                    }
                    onPick={point => setEdit(s => ({ ...s, ...point }))}
                  />
                  <p className="small">
                    Click the map or enter verified coordinates. Seed locations are approximate.
                  </p>
                </div>
              </div>

              {/* right column (sidebar) */}
              <aside>
                <div className="panel">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={edit.published}
                      onChange={e => set('published', e.target.checked)}
                    />
                    Published
                  </label>

                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(edit.featured)}
                      onChange={e => set('featured', e.target.checked)}
                    />
                    Featured attraction
                  </label>

                  <p className="small admin-featured-help">
                    Show in the homepage Featured section when published.
                    Drafts and archived attractions stay hidden.
                  </p>

                  <button className="auth-submit" disabled={busy}>
                    {busy ? 'Saving…' : 'Save attraction'}
                  </button>

                  <button
                    type="button"
                    className="outline full"
                    onClick={() => setEdit(null)}
                  >
                    Cancel
                  </button>
                </div>
              </aside>
            </form>

          ) : (
            /* ── dashboard / attractions list ── */
            <>
              {section === 'dashboard' && (
                <div className="admin-stats">
                  {[
                    ['Total attractions', places.length],
                    ['Published',  places.filter(a =>  a.published && !a.archived).length],
                    ['Drafts',     places.filter(a => !a.published && !a.archived).length],
                    ['Archived',   places.filter(a =>  a.archived).length],
                  ].map(([label, n], i) => (
                    <div className={'panel stat-' + i} key={label}>
                      <span className="admin-stat-label">{label}</span>
                      <strong>{n}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="panel admin-directory">
                {/* toolbar */}
                <div className="admin-table-toolbar">
                  <div>
                    <h2>Attractions</h2>
                    <p>{filtered.length} {filtered.length === 1 ? 'place' : 'places'} in your directory</p>
                  </div>
                  <div className="admin-directory-controls">
                    <input
                      aria-label="Search admin attractions"
                      placeholder="Search attractions…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                    <select
                      aria-label="Filter attractions by status"
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All statuses</option>
                      <option value="published">Published</option>
                      <option value="draft">Drafts</option>
                      <option value="archived">Archived</option>
                    </select>
                    <button
                      type="button"
                      className="auth-submit"
                      onClick={() => startEdit(EMPTY)}
                    >
                      + Add attraction
                    </button>
                  </div>
                </div>

                {loading && places.length === 0 && (
                  <p className="admin-list-state" role="status">Loading attractions…</p>
                )}

                {/* desktop table */}
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Fee</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(a => (
                        <tr key={a.id}>
                          <td>
                            <span>{a.name}</span>
                            {a.featured && (
                              <span className="admin-featured-badge">Featured</span>
                            )}
                          </td>
                          <td>{a.category}</td>
                          <td>{a.cost ? money(a.cost) : 'Free'}</td>
                          <td>
                            <span className={a.archived ? 'status-archived' : a.published ? 'status-published' : 'status-draft'}>
                              {a.archived ? 'Archived' : a.published ? 'Published' : 'Draft'}
                            </span>
                          </td>
                          <td>
                            <div className="admin-table-actions">
                              <button type="button" className="text-button" onClick={() => startEdit(a)}>
                                Edit
                              </button>
                              <button
                                type="button"
                                className="text-button"
                                disabled={a.archived}
                                onClick={() => publish(a)}
                              >
                                {a.published ? 'Unpublish' : 'Publish'}
                              </button>
                              <button type="button" className="text-button archive-button" onClick={() => archive(a)}>
                                {a.archived ? 'Restore' : 'Archive'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!filtered.length && (
                        <tr>
                          <td colSpan="5" className="admin-empty">
                            {loadError && !places.length ? 'Attractions could not be loaded.'
                              : search || statusFilter !== 'all'
                              ? 'No attractions match your search or status filter.'
                              : loading ? 'Loading attractions…'
                              : 'No attractions yet. Add your first place to get started.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* mobile cards */}
                <ul className="admin-mobile-places" aria-label="Attractions">
                  {filtered.map(a => (
                    <li key={a.id} className="admin-mobile-place">
                      <div className="admin-mobile-place-heading">
                        <h3>
                          {a.name}
                          {a.featured && <span className="admin-featured-badge">Featured</span>}
                        </h3>
                        <span className={a.archived ? 'status-archived' : a.published ? 'status-published' : 'status-draft'}>
                          {a.archived ? 'Archived' : a.published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <dl>
                        <div>
                          <dt>Category</dt>
                          <dd>{a.category}</dd>
                        </div>
                        <div>
                          <dt>Entrance fee</dt>
                          <dd>{a.cost ? money(a.cost) : 'Free'}</dd>
                        </div>
                      </dl>
                      <div className="admin-mobile-place-actions">
                        <button
                          type="button"
                          className="outline"
                          onClick={() => startEdit(a)}
                          aria-label={'Edit ' + a.name}
                        >
                          Edit details
                        </button>
                        <button
                          type="button"
                          className="text-button"
                          disabled={a.archived}
                          onClick={() => publish(a)}
                          aria-label={(a.published ? 'Unpublish ' : 'Publish ') + a.name}
                        >
                          {a.published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => archive(a)}
                          aria-label={(a.archived ? 'Restore ' : 'Archive ') + a.name}
                        >
                          {a.archived ? 'Restore' : 'Archive'}
                        </button>
                      </div>
                    </li>
                  ))}
                  {!filtered.length && (
                    <li className="admin-empty">
                      {loadError && !places.length ? 'Attractions could not be loaded.'
                        : search || statusFilter !== 'all'
                        ? 'No attractions match your search or status filter.'
                        : loading ? 'Loading attractions…'
                        : 'No attractions yet. Add your first place to get started.'}
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

