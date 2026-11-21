import { useEffect, useMemo, useState } from 'react';
import { attractionPhoto } from '../../components/media/imageUrls.js';
import './SavedPlacesPage.css';

const storageKey = userId => `lakbaynaga.savedPlaces.v2.${userId}`;

function readSaved(userId) {
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Your saved-place list could not be read.');
  return parsed.filter(item => item && typeof item.id === 'string')
    .map(item => ({
      id: item.id,
      at: Number.isFinite(item.at) && Number.isFinite(new Date(item.at).getTime()) ? item.at : 0,
    }));
}

function formatPlaceName(value) {
  return String(value || '').trim().toLocaleLowerCase();
}

function PlaceCard({ place, savedAt, onRemove, removing }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = attractionPhoto(place.imageUrl);
  const description = place.description || place.heading || 'Explore this place in Naga City.';
  const date = savedAt
    ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(savedAt))
    : '';

  return (
    <article className="saved-place-card">
      {image && !imageFailed ? (
        <img className="saved-place-image" src={image} alt={place.name}
          loading="lazy" onError={() => setImageFailed(true)} />
      ) : (
        <div className="saved-place-image saved-place-image--empty" role="img" aria-label={`No photo available for ${place.name}`}>
          Photo unavailable
        </div>
      )}
      <div className="saved-place-content">
        <div className="saved-place-topline">
          <span className="saved-place-category">{place.category || 'Attraction'}</span>
          <span className="saved-place-saved" title={date}>
            <BookmarkIcon />{date && Date.now() - savedAt < 60_000 ? 'Just saved' : 'Saved'}
          </span>
        </div>
        <h2>{place.name}</h2>
        <p className="saved-place-description">{description}</p>
        <p className="saved-place-location">{place.area || place.location || 'Naga City'} · Naga City</p>
        <div className="saved-place-actions">
          <a className="saved-place-view" href={'#place/' + encodeURIComponent(place.id)}>
            View place <span aria-hidden="true">&#8594;</span>
          </a>
          <button type="button" className="saved-place-remove" disabled={removing}
            onClick={() => onRemove(place.id)}>
            <TrashIcon />{removing ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function SavedPlacesPage({ user }) {
  const [saved, setSaved] = useState([]);
  const [places, setPlaces] = useState([]);
  const [sort, setSort] = useState('recent');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [removingId, setRemovingId] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/attractions', { signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) throw new Error('Could not load your saved places. Please try again.');
        const savedRows = readSaved(user.id);
        if (controller.signal.aborted) return;
        setPlaces(data);
        setSaved(savedRows);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof TypeError
            ? 'Unable to connect. Check your connection and try again.'
            : loadError.message || 'Could not load your saved places.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [user.id]);

  const joined = useMemo(() => {
    const byId = new Map(places.map(place => [String(place.id), place]));
    return saved.map(entry => ({ entry, place: byId.get(entry.id) })).filter(row => row.place);
  }, [places, saved]);

  const sorted = useMemo(() => {
    const copy = [...joined];
    if (sort === 'name') copy.sort((a, b) => formatPlaceName(a.place.name).localeCompare(formatPlaceName(b.place.name)));
    else if (sort === 'category') copy.sort((a, b) => formatPlaceName(a.place.category).localeCompare(formatPlaceName(b.place.category)) || formatPlaceName(a.place.name).localeCompare(formatPlaceName(b.place.name)));
    else copy.sort((a, b) => b.entry.at - a.entry.at);
    return copy;
  }, [joined, sort]);

  const categoryCounts = useMemo(() => {
    const counts = new Map();
    for (const { place } of joined) {
      const category = place.category || 'Other';
      counts.set(category, (counts.get(category) || 0) + 1);
    }
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [joined]);

  function removePlace(id) {
    if (removingId) return;
    setRemovingId(id);
    setError('');
    setMessage('');
    try {
      const next = saved.filter(item => item.id !== id);
      localStorage.setItem(storageKey(user.id), JSON.stringify(next));
      setSaved(next);
      setMessage('Place removed from your saved places.');
      window.dispatchEvent(new CustomEvent('saved-places-updated', { detail: { userId: user.id } }));
    } catch {
      setError('Your browser could not update saved places. Please try again.');
    } finally {
      setRemovingId('');
    }
  }

  const unavailableCount = Math.max(0, saved.length - joined.length);

  return (
    <main className="saved-places-page">
      <div className="saved-places-shell">
        <header className="saved-places-heading">
          <div>
            <p className="saved-places-eyebrow"><span aria-hidden="true" />YOUR NAGA SHORTLIST</p>
            <h1>Saved places</h1>
            <p>A little inspiration for your next visit. Keep your favorites close.</p>
          </div>
          <a className="saved-places-explore" href="#explore"><span aria-hidden="true">&#8594;</span>Explore more places</a>
        </header>

        {error && <p className="saved-places-error" role="alert">{error}</p>}
        {message && <p className="saved-places-message" role="status">{message}</p>}

        <div className="saved-places-toolbar">
          <h2>{saved.length} {saved.length === 1 ? 'saved place' : 'saved places'}</h2>
          <label>Sort by
            <select value={sort} onChange={event => setSort(event.target.value)}>
              <option value="recent">Recently saved</option>
              <option value="name">Name</option>
              <option value="category">Category</option>
            </select>
          </label>
        </div>

        {loading ? (
          <p className="saved-places-state" role="status">Loading your saved places…</p>
        ) : error && !places.length ? (
          <div className="saved-places-state">
            <p>We couldn’t load your collection.</p>
            <button type="button" onClick={() => window.location.reload()}>Try again</button>
          </div>
        ) : saved.length === 0 ? (
          <div className="saved-places-empty">
            <h2>Your shortlist is empty</h2>
            <p>Save places you like while exploring Naga, and they’ll appear here.</p>
            <a href="#explore">Explore places <span aria-hidden="true">&#8594;</span></a>
          </div>
        ) : (
          <div className="saved-places-layout">
            <section className="saved-places-list" aria-label="Your saved places" aria-busy={Boolean(removingId)}>
              {unavailableCount > 0 && (
                <p className="saved-places-unavailable" role="status">
                  {unavailableCount} saved {unavailableCount === 1 ? 'place is' : 'places are'} no longer publicly available.
                </p>
              )}
              {sorted.length ? sorted.map(({ place, entry }) => (
                <PlaceCard key={place.id} place={place} savedAt={entry.at}
                  removing={removingId === place.id} onRemove={removePlace} />
              )) : <div className="saved-places-empty"><p>Your saved places are no longer available.</p><a href="#explore">Explore current places</a></div>}
              {sorted.some(({ place }) => place.photoCredit) && (
                <p className="saved-places-credit">Photo credits: {[...new Set(sorted.map(({ place }) => place.photoCredit).filter(Boolean))].join('; ')}.</p>
              )}
            </section>
            <aside className="saved-places-aside">
              <section className="saved-places-collection">
                <h2><BookmarkIcon />Your collection</h2>
                <p>{joined.length === 1 ? 'One place.' : `${joined.length} places.`} A few different ways to get to know Naga.</p>
                <ul>
                  {categoryCounts.map(([category, count]) => <li key={category}><span>{category}</span><strong>{count}</strong></li>)}
                  {!categoryCounts.length && <li><span>Available places</span><strong>0</strong></li>}
                </ul>
              </section>
              <section className="saved-places-note">
                <span className="saved-places-note-accent" aria-hidden="true" />
                <h2>A shortlist, not a schedule</h2>
                <p>Leave room to explore at your own pace. Before heading out, check current visitor information directly with each place.</p>
                <a href="#explore">Back to Explore Naga <span aria-hidden="true">&#8594;</span></a>
              </section>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function BookmarkIcon() {
  return <svg aria-hidden="true" width="16" height="18" viewBox="0 0 20 22" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4Z" /></svg>;
}

function TrashIcon() {
  return <svg aria-hidden="true" width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h14M7 5V3h6v2m-8 0 1 12h8l1-12M8 8v6m4-6v6" /></svg>;
}
