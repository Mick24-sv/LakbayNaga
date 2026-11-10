import { useState } from 'react';
import './TripsPage.css';

/* ─── Helpers ───────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="trips-empty">
      <div className="trips-empty-icon" aria-hidden="true">🗺️</div>
      <h2>No trips yet</h2>
      <p>Plan your first Naga adventure by adding attractions below.</p>
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────────────── */
export default function TripsPage({ user }) {
  const [trips, setTrips] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', notes: '' });
  const [expandedId, setExpandedId] = useState(null);

  function handleAdd(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setTrips(prev => [
      ...prev,
      { id: Date.now(), ...form, attractions: [] },
    ]);
    setForm({ title: '', date: '', notes: '' });
    setShowForm(false);
  }

  function handleDelete(id) {
    if (window.confirm('Remove this trip?')) {
      setTrips(prev => prev.filter(t => t.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  }

  function toggleExpand(id) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  return (
    <main className="trips-page">
      <div className="trips-container">
        {/* Header */}
        <div className="trips-header">
          <div>
            <p className="trips-eyebrow">My Itineraries</p>
            <h1>My Trips</h1>
            <p className="trips-intro">
              Plan and save your Naga visit schedules,{' '}
              {user?.firstName ? user.firstName : 'traveller'}.
            </p>
          </div>
          <button
            className="trips-add-btn"
            onClick={() => setShowForm(s => !s)}
          >
            {showForm ? 'Cancel' : '+ New Trip'}
          </button>
        </div>

        {/* New trip form */}
        {showForm && (
          <form className="trips-form panel" onSubmit={handleAdd}>
            <h2 className="trips-form-heading">New Trip</h2>

            <label className="trips-label">
              Trip name
              <input
                className="trips-input"
                type="text"
                placeholder="e.g. Naga Weekend Getaway"
                maxLength={80}
                required
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </label>

            <label className="trips-label">
              Date
              <input
                className="trips-input"
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </label>

            <label className="trips-label">
              Notes
              <textarea
                className="trips-textarea"
                rows={3}
                placeholder="Any details or reminders…"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </label>

            <div className="trips-form-footer">
              <button type="submit" className="trips-submit">Save Trip</button>
            </div>
          </form>
        )}

        {/* Trip list */}
        {trips.length === 0 && !showForm ? (
          <EmptyState />
        ) : (
          <ul className="trips-list">
            {trips.map(trip => (
              <li key={trip.id} className="trips-card panel">
                <div className="trips-card-header">
                  <div className="trips-card-meta">
                    <h2 className="trips-card-title">{trip.title}</h2>
                    {trip.date && (
                      <span className="trips-card-date">
                        📅 {new Date(trip.date + 'T00:00:00').toLocaleDateString('en-PH', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                  <div className="trips-card-actions">
                    <button
                      className="trips-toggle-btn"
                      onClick={() => toggleExpand(trip.id)}
                    >
                      {expandedId === trip.id ? 'Hide details' : 'View details'}
                    </button>
                    <button
                      className="trips-delete-btn"
                      onClick={() => handleDelete(trip.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {expandedId === trip.id && (
                  <div className="trips-card-body">
                    {trip.notes ? (
                      <p className="trips-card-notes">{trip.notes}</p>
                    ) : (
                      <p className="trips-card-notes trips-card-notes--empty">
                        No notes added.
                      </p>
                    )}
                    <div className="trips-attractions-placeholder">
                      <span>No attractions added yet.</span>
                      <a href="#explore">Browse attractions →</a>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
