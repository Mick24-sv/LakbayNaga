import { useCallback, useEffect, useRef, useState } from 'react';
import { formatPHP } from '../planner/plannerLogic.js';
import './TripsPage.css';

const EDIT_KEY = 'lakbaynaga.itinerary.edit';

async function itineraryRequest(path, options = {}) {
  const response = await fetch('/api/itineraries' + path, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw new Error('Your session expired. Please log in again.');
    throw new Error(data.error || 'Could not complete the itinerary request.');
  }
  return data;
}

function tripDate(plan) {
  const startDate = plan?.settings?.startDate;
  if (!startDate) return 'Dates not selected';
  const date = new Date(startDate + 'T00:00:00');
  return Number.isNaN(date.getTime())
    ? 'Dates not selected'
    : date.toLocaleDateString('en-CA');
}

function EmptyState() {
  return (
    <section className="trips-empty" aria-labelledby="trips-empty-heading">
      <h2 id="trips-empty-heading">No saved itineraries yet</h2>
      <p>Generate a trip in the itinerary planner, then save it here.</p>
      <a className="trips-empty-link" href="#planner">Plan a trip</a>
    </section>
  );
}

export default function TripsPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState('');
  const [openingId, setOpeningId] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [message, setMessage] = useState('');
  const mutationLock = useRef(false);
  const loadingRequest = useRef(null);

  const loadTrips = useCallback(async () => {
    loadingRequest.current?.abort();
    const controller = new AbortController();
    loadingRequest.current = controller;
    setLoading(true);
    setError('');
    setLoadFailed(false);
    try {
      const rows = await itineraryRequest('', { signal: controller.signal });
      if (!Array.isArray(rows)) throw new Error('The server did not return a saved-itinerary list.');
      if (controller.signal.aborted) return;
      setTrips(rows);
    } catch (requestError) {
      if (controller.signal.aborted) return;
      setLoadFailed(true);
      setError(requestError instanceof TypeError
        ? 'Unable to connect. Check your connection and try again.'
        : requestError.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => { loadTrips(); return () => loadingRequest.current?.abort(); }, [loadTrips]);

  async function deleteTrip(trip) {
    if (mutationLock.current || loading) return;
    if (!window.confirm(`Delete “${trip.name}”? This cannot be undone.`)) return;
    mutationLock.current = true;
    setMessage('');
    setPendingDelete(trip.id);
    setError('');
    try {
      await itineraryRequest('/' + encodeURIComponent(trip.id), { method: 'DELETE' });
      setTrips(current => current.filter(row => row.id !== trip.id));
      setMessage('Itinerary deleted.');
    } catch (requestError) {
      setError(requestError instanceof TypeError
        ? 'Unable to connect. Check your connection and try again.'
        : requestError.message);
    } finally {
      mutationLock.current = false;
      setPendingDelete('');
    }
  }

  async function openTrip(trip) {
    if (mutationLock.current || loading) return;
    mutationLock.current = true;
    setOpeningId(trip.id);
    setError('');
    setMessage('');
    try {
      // Load the authoritative owned record; the list may be stale.
      const saved = await itineraryRequest('/' + encodeURIComponent(trip.id));
      sessionStorage.setItem(EDIT_KEY, JSON.stringify(saved));
      window.location.hash = 'planner';
    } catch (requestError) {
      setError(requestError instanceof TypeError
        ? 'Unable to connect. Check your connection and try again.'
        : requestError.message);
    } finally {
      mutationLock.current = false;
      setOpeningId('');
    }
  }

  return (
    <main className="trips-page">
      <div className="trips-container">
        <header className="trips-heading">
          <p className="trips-eyebrow"><span aria-hidden="true" />YOUR TRAVEL PLANS</p>
          <h1>Saved itineraries</h1>
          <p>Keep your Naga days in one place.</p>
        </header>

        {error && <p className="trips-feedback" role="alert">{error}</p>}
        {message && <p className="trips-message" role="status">{message}</p>}

        {loading ? (
          <p className="trips-loading" role="status">Loading your saved itineraries…</p>
        ) : loadFailed ? (
          <div className="trips-load-error">
            <p>Your saved itineraries could not be loaded.</p>
            <button type="button" className="trips-open-btn" onClick={loadTrips}>Try again</button>
            <a href="#login">Log in again</a>
          </div>
        ) : trips.length === 0 ? <EmptyState /> : (
          <>
            <p className="trips-count" aria-live="polite">
              {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
            </p>
            <ul className="trips-list">
              {trips.map(trip => {
                const plan = trip.plan || {};
                const stops = Array.isArray(plan.stops) ? plan.stops : [];
                const days = Number(plan.settings?.days) || plan.days?.length || 1;
                const travelers = Number(plan.settings?.people) || 1;
                const photo = stops.find(stop => stop.imageUrl)?.imageUrl;
                return (
                  <li className="trips-card" key={trip.id}>
                    {photo ? (
                      <img className="trips-card-photo" src={photo} alt={stops.find(stop => stop.imageUrl)?.name || 'Attraction in this itinerary'} />
                    ) : (
                      <div className="trips-card-photo trips-card-photo--fallback" aria-hidden="true">LakbayNaga</div>
                    )}
                    <div className="trips-card-content">
                      <h2>{trip.name}</h2>
                      <p>{days} {days === 1 ? 'day' : 'days'} · {stops.length} {stops.length === 1 ? 'stop' : 'stops'} · {travelers} {travelers === 1 ? 'traveler' : 'travelers'}</p>
                      <p>{tripDate(plan)}</p>
                      <p className="trips-card-expenses">Est. expenses {formatPHP(plan.totals?.total)}</p>
                      <div className="trips-card-actions">
                        <button type="button" className="trips-open-btn" disabled={Boolean(pendingDelete || openingId)} onClick={() => openTrip(trip)}>{openingId === trip.id ? 'Opening...' : 'Open / edit'}</button>
                        <button type="button" className="trips-delete-btn" disabled={Boolean(pendingDelete || openingId)} onClick={() => deleteTrip(trip)}>
                          {pendingDelete === trip.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}

export { EDIT_KEY };
