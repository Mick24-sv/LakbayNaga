import { useState } from 'react';
import {
  BUDGET_MAX,
  BUDGET_SLIDER_MAX,
  CATEGORIES,
  PACE_OPTIONS,
  TRANSPORT_OPTIONS,
  formatPHP,
  minutesToTime,
  usePlannerForm,
} from './plannerLogic.js';
import PlannerRouteMap from './PlannerRouteMap.jsx';
import './PlannerPage.css';


export default function PlannerPage({ onNeedLogin }) {
  const {
    values,
    update,
    togglePreference,
    generate,
    result,
    busy,
    error,
  } = usePlannerForm();

  function handleSubmit(event) {
    event.preventDefault();
    generate(onNeedLogin);
  }

  const days    = Math.max(1, parseInt(values.days)   || 1);
  const people  = Math.max(1, parseInt(values.people) || 1);
  const budget  = parseFloat(values.budget) || 0;

  return (
    <main className="planner-page">
      <div className="planner-shell">
        <header className="planner-heading">
          <span className="planner-eyebrow">— PLAN A VISIT</span>
          <h1>Plan your trip</h1>
          <p>Set your dates, budget, and preferences. Build a Naga trip at your pace.</p>
        </header>
        <div className="planner-layout">

        {/* ── LEFT: form ────────────────────────────────────────────────── */}
        <div className="planner-left">
          <form onSubmit={handleSubmit} noValidate>

            {/* Budget & dates */}
            <section className="planner-card" aria-labelledby="planner-budget-heading">
              <h2 id="planner-budget-heading">Budget &amp; dates</h2>

              <div className="planner-field">
                <label htmlFor="planner-budget">Total group budget (₱)</label>
                <input
                  id="planner-budget"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={BUDGET_MAX}
                  step="0.01"
                  required
                  value={values.budget}
                  onChange={e => update('budget', e.target.value)}
                />
                <input
                  aria-label="Adjust total group budget"
                  type="range"
                  className="planner-slider"
                  min="0"
                  max={BUDGET_SLIDER_MAX}
                  step="100"
                  value={Math.min(parseFloat(values.budget) || 0, BUDGET_SLIDER_MAX)}
                  onChange={e => update('budget', e.target.value)}
                />
              </div>

              <div className="planner-field">
                <label htmlFor="planner-start-date">
                  Start date (optional)
                </label>
                <input
                  id="planner-start-date"
                  type="date"
                  value={values.startDate}
                  onChange={e => update('startDate', e.target.value)}
                />
              </div>

              <div className="planner-row-3">
                <div className="planner-field">
                  <label htmlFor="planner-days">Days</label>
                  <input
                    id="planner-days"
                    type="number"
                    inputMode="numeric"
                    min="1" max="7" step="1"
                    required
                    value={values.days}
                    onChange={e => update('days', e.target.value)}
                  />
                </div>

                <div className="planner-field">
                  <label htmlFor="planner-people">Travelers</label>
                  <input
                    id="planner-people"
                    type="number"
                    inputMode="numeric"
                    min="1" max="20" step="1"
                    required
                    value={values.people}
                    onChange={e => update('people', e.target.value)}
                  />
                </div>

                <div className="planner-field">
                  <label htmlFor="planner-hours">Hours per day</label>
                  <input
                    id="planner-hours"
                    type="number"
                    inputMode="numeric"
                    min="1" max="12" step="1"
                    required
                    value={values.hours}
                    onChange={e => update('hours', e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Trip preferences */}
            <section className="planner-card" aria-labelledby="planner-prefs-heading">
              <h2 id="planner-prefs-heading">Trip preferences</h2>
              <p className="planner-hint">Leave interests blank to explore all categories.</p>

              <div className="planner-checkboxes">
                {CATEGORIES.map(cat => (
                  <label key={cat} className="planner-checkbox-label">
                    <input
                      type="checkbox"
                      checked={values.preferences.includes(cat)}
                      onChange={() => togglePreference(cat)}
                    />
                    {cat}
                  </label>
                ))}
              </div>

              <div className="planner-row-2">
                <div className="planner-field">
                  <label htmlFor="planner-pace">Pace</label>
                  <select
                    id="planner-pace"
                    value={values.pace}
                    onChange={e => update('pace', e.target.value)}
                  >
                    {PACE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="planner-field">
                  <label htmlFor="planner-transport">Transport</label>
                  <select
                    id="planner-transport"
                    value={values.transport}
                    onChange={e => update('transport', e.target.value)}
                  >
                    {TRANSPORT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Food & accommodation */}
            <section className="planner-card" aria-labelledby="planner-food-heading">
              <h2 id="planner-food-heading">Food &amp; accommodation</h2>

              <div className="planner-field">
                <label htmlFor="planner-food">
                  Food allowance / person / day (₱)
                </label>
                <input
                  id="planner-food"
                  type="number"
                  inputMode="decimal"
                  min="0" max="5000" step="0.01"
                  value={values.foodPerPersonDay}
                  onChange={e => update('foodPerPersonDay', e.target.value)}
                />
              </div>

              <div className="planner-field">
                <label htmlFor="planner-lodging">
                  Accommodation / group / night (₱)
                </label>
                <input
                  id="planner-lodging"
                  type="number"
                  inputMode="decimal"
                  min="0" max="100000" step="0.01"
                  value={values.lodgingPerNight}
                  onChange={e => update('lodgingPerNight', e.target.value)}
                />
              </div>

              <p className="planner-hint">
                These are your own allowances, not quotes or bookings. Zero excludes
                the category. Accommodation covers days minus one nights.
              </p>
            </section>

            {error && (
              <div className="planner-error" role="alert">{error}</div>
            )}

            <button
              type="submit"
              className="planner-generate-btn"
              disabled={busy}
            >
              {busy ? 'Generating…' : '+ Generate Itinerary'}
            </button>
          </form>
        </div>

        {/* ── RIGHT: preview or results ─────────────────────────────────── */}
        <div className="planner-right">
          {!result ? (
            <TripPreview days={days} people={people} budget={budget} />
          ) : (
            <ItineraryResults
              result={result}
            />
          )}
        </div>

      </div>
      </div>
    </main>
  );
}


// ── Preview panel (before generation) ────────────────────────────────────────

function TripPreview({ days, people, budget }) {
  return (
    <div className="planner-preview-card">
      <span className="planner-preview-label">Your trip</span>
      <p className="planner-preview-title">
        {days} {days === 1 ? 'day' : 'days'} · {people}{' '}
        {people === 1 ? 'traveler' : 'travelers'}
      </p>
      <div className="planner-preview-budget">
        <span>Total budget</span>
        <strong>{formatPHP(budget)}</strong>
      </div>
      <p className="planner-preview-cta">
        Choose your preferences and generate your trip.
      </p>
    </div>
  );
}


// ── Results panel (after generation) ─────────────────────────────────────────

function ItineraryResults({ result }) {
  const [activeDay, setActiveDay] = useState(1);

  const { days, totals, notice, settings } = result;
  const hasStops = result.stops.length > 0;
  const currentDay = days.find(d => d.day === activeDay) ?? days[0];

  const totalStops  = result.stops.length;
  const totalMins   = totals.minutes;

  return (
    <div className="planner-results">

      {/* Header */}
      <div className="planner-results-header">
        <h2>
          {settings.days} {settings.days === 1 ? 'day' : 'days'} in Naga
        </h2>
        <p className="planner-results-meta">
          {totalStops} {totalStops === 1 ? 'stop' : 'stops'} · {totalMins} planned minutes
        </p>
      </div>

      {/* Day tabs */}
      {days.length > 1 && (
        <div className="planner-day-tabs" role="tablist" aria-label="Select day">
          {days.map(day => (
            <button
              key={day.day}
              role="tab"
              aria-selected={activeDay === day.day}
              className="planner-day-tab"
              onClick={() => setActiveDay(day.day)}
            >
              Day {day.day}{day.date ? ` · ${day.date}` : ''}
            </button>
          ))}
        </div>
      )}

      {days.length === 1 && (
        <div className="planner-day-tabs">
          <span className="planner-day-tab planner-day-tab--single" aria-current="true">
            Day 1{days[0].date ? ` · ${days[0].date}` : ''}
          </span>
        </div>
      )}

      {/* Stop list */}
      {!hasStops ? (
        <div className="planner-empty">
          <p>No attractions fit your budget and time settings.</p>
          <p className="planner-empty-hint">
            Try increasing your budget, hours, or selecting fewer interest categories.
          </p>
        </div>
      ) : currentDay.stops.length === 0 ? (
        <div className="planner-empty" role="status">
          <p>No stops are scheduled for this day.</p>
          <p className="planner-empty-hint">Choose another day to see its planned stops.</p>
        </div>
      ) : (
        <ol className="planner-stops">
          {currentDay.stops.map((stop, index) => (
            <StopRow
              key={stop.id + '-' + index}
              stop={stop}
              index={index}
            />
          ))}
        </ol>
      )}

      {/* Map */}
      {currentDay.stops.length > 0 && (
        <PlannerMap stops={currentDay.stops} day={currentDay.day} transport={settings.transport} distanceKm={currentDay.distanceKm} />
      )}

      {/* Expense summary */}
      <section className="planner-expenses" aria-labelledby="planner-expenses-heading">
        <h3 id="planner-expenses-heading">Estimated expenses – whole trip</h3>
        <dl className="planner-expense-table">
          <div>
            <dt>Admissions</dt>
            <dd>{formatPHP(totals.admissions)}</dd>
          </div>
          <div>
            <dt>Transport allowance</dt>
            <dd>{formatPHP(totals.transportAllowance)}</dd>
          </div>
          <div>
            <dt>Food allowance</dt>
            <dd>{formatPHP(totals.food)}</dd>
          </div>
          <div>
            <dt>Accommodation allowance</dt>
            <dd>{formatPHP(totals.lodging)}</dd>
          </div>
          <div className="planner-expense-total">
            <dt>Total</dt>
            <dd>{formatPHP(totals.total)}</dd>
          </div>
          <div className="planner-expense-remaining">
            <dt>Remaining budget</dt>
            <dd>{formatPHP(totals.remaining)}</dd>
          </div>
        </dl>
      </section>

      {/* Backend notice */}
      {notice && (
        <p className="planner-notice">{notice}</p>
      )}
    </div>
  );
}


// ── Stop row ──────────────────────────────────────────────────────────────────

function StopRow({ stop, index }) {
  const startTime = minutesToTime(stop.startMinutes);

  return (
    <li className="planner-stop">
      <span className="planner-stop-num" aria-hidden="true">{index + 1}.</span>
      <div className="planner-stop-info">
        <span className="planner-stop-time">
          {startTime} · {stop.duration} minute visit
        </span>
        <strong className="planner-stop-name">{stop.name}</strong>
        {stop.area && (
          <span className="planner-stop-area">{stop.area}</span>
        )}
      </div>
    </li>
  );
}


// ── Map ───────────────────────────────────────────────────────────────────────

function PlannerMap({ stops, day, transport, distanceKm }) {
  const validStops = stops.filter(s => Number.isFinite(s.lat) && Number.isFinite(s.lng));

  const gmTravelMode = { walk: 'walking', public: 'transit', private: 'driving' }[transport] ?? 'transit';

  // Build Google Maps directions URL
  function gmapsUrl() {
    if (validStops.length === 0) return null;
    if (validStops.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${validStops[0].lat},${validStops[0].lng}`;
    }
    const origin = `${validStops[0].lat},${validStops[0].lng}`;
    const dest   = `${validStops.at(-1).lat},${validStops.at(-1).lng}`;
    const wps    = validStops.slice(1, -1).map(s => `${s.lat},${s.lng}`).join('|');
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=${gmTravelMode}`;
    if (wps) url += `&waypoints=${encodeURIComponent(wps)}`;
    return url;
  }

  if (validStops.length === 0) {
    return (
      <div className="planner-map planner-map-empty">
        <p>No coordinates available for this day's stops.</p>
      </div>
    );
  }

  const mapsLink = gmapsUrl();

  return (
    <div className="planner-map">
      <PlannerRouteMap stops={stops} day={day} />

      {mapsLink && (
        <a
          href={mapsLink}
          className="planner-gmaps-btn"
          target="_blank"
          rel="noreferrer"
        >
          Open directions in Google Maps ↗
        </a>
      )}

      <p className="planner-map-note">
        Dashed lines connect approximate locations; they are not actual road routes.
        {distanceKm > 0 && (
          <> {distanceKm} km straight-line between stops; not a road-distance estimate.</>
        )}
      </p>
    </div>
  );
}

