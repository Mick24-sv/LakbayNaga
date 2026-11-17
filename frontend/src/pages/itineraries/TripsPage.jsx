import { useCallback, useEffect, useState } from 'react';
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

  const loadTrips = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await itineraryRequest('');
      setTrips(Array.isArray(rows) ? rows : []);
    } catch (requestError) {
      setError(requestError instanceof TypeError
        ? 'Unable to connect. Check your connection and try again.'
        : requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  async function deleteTrip(trip) {
    if (!window.confirm(`Delete “${trip.name}”? This cannot be undone.`)) return;
    setPendingDelete(trip.id);
    setError('');
    try {
      await itineraryRequest('/' + encodeURIComponent(trip.id), { method: 'DELETE' });
      setTrips(current => current.filter(row => row.id !== trip.id));
    } catch (requestError) {
      setError(requestError instanceof TypeError
        ? 'Unable to connect. Check your connection and try again.'
        : requestError.message);
    } finally {
      setPendingDelete('');
    }
  }

  function openTrip(trip) {
    try {
      sessionStorage.setItem(EDIT_KEY, JSON.stringify(trip));
      window.location.hash = 'planner';
    } catch {
      setError('Your browser could not open this itinerary. Please try again.');
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

        {loading ? (
          <p className="trips-loading" role="status">Loading your saved itineraries…</p>
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
                        <button type="button" className="trips-open-btn" onClick={() => openTrip(trip)}>Open / edit</button>
                        <button type="button" className="trips-delete-btn" disabled={pendingDelete === trip.id} onClick={() => deleteTrip(trip)}>
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
