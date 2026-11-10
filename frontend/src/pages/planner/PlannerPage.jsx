import { useRef, useState } from 'react';
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
  const selectedDay = days.some(day => day.day === activeDay)
    ? activeDay
    : days[0]?.day ?? 1;
  const currentDay = days.find(day => day.day === selectedDay) ?? days[0];
  const hasStopsToday = Boolean(currentDay?.stops?.length);

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
              aria-selected={selectedDay === day.day}
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
      ) : !hasStopsToday ? (
        <div className="planner-empty" role="status">
          <p>No attractions are scheduled for Day {currentDay.day}.</p>
          <p className="planner-empty-hint">
            Other days have planned stops. Choose another day above or adjust your
            trip settings and generate a new itinerary.
          </p>
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
      {hasStopsToday && (
        <PlannerMap key={currentDay.day} stops={currentDay.stops} day={currentDay.day} transport={settings.transport} distanceKm={currentDay.distanceKm} />
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
  const [zoom, setZoom] = useState(() => fitZoom(stops));
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef(null);
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

  const W = 600, H = 300;
  const tileSize = 256;
  const tileCount = 2 ** zoom;
  const centerLat = (Math.min(...validStops.map(stop => stop.lat)) + Math.max(...validStops.map(stop => stop.lat))) / 2;
  const centerLng = (Math.min(...validStops.map(stop => stop.lng)) + Math.max(...validStops.map(stop => stop.lng))) / 2;
  const centerX = worldX(centerLng, zoom);
  const centerY = worldY(centerLat, zoom);
  const points = validStops.map(stop => ({
    x: worldX(stop.lng, zoom) - centerX + W / 2 + pan.x,
    y: worldY(stop.lat, zoom) - centerY + H / 2 + pan.y,
  }));
  const firstTileX = Math.floor((centerX - pan.x - W / 2) / tileSize);
  const lastTileX = Math.floor((centerX - pan.x + W / 2) / tileSize);
  const firstTileY = Math.max(0, Math.floor((centerY - pan.y - H / 2) / tileSize));
  const lastTileY = Math.min(tileCount - 1, Math.floor((centerY - pan.y + H / 2) / tileSize));
  const tiles = [];
  for (let y = firstTileY; y <= lastTileY; y += 1) {
    for (let x = firstTileX; x <= lastTileX; x += 1) {
      const wrappedX = ((x % tileCount) + tileCount) % tileCount;
      tiles.push({
        key: `${zoom}-${x}-${y}`,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
        x: x * tileSize - centerX + W / 2 + pan.x,
        y: y * tileSize - centerY + H / 2 + pan.y,
      });
    }
  }

  function changeZoom(amount) {
    setZoom(current => Math.max(11, Math.min(18, current + amount)));
  }

  function startPan(event) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, pan };
  }

  function movePan(event) {
    if (drag.current?.pointerId !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setPan({
      x: drag.current.pan.x + (event.clientX - drag.current.x) * W / bounds.width,
      y: drag.current.pan.y + (event.clientY - drag.current.y) * H / bounds.height,
    });
  }

  function stopPan(event) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }

  const mapsLink = gmapsUrl();

  return (
    <div className="planner-map">
      <div className="planner-map-wrapper">
        <svg
          className="planner-map-canvas"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Map of Day ${day} attraction stops. Drag to pan; use zoom buttons to change scale.`}
          onPointerDown={startPan}
          onPointerMove={movePan}
          onPointerUp={stopPan}
          onPointerCancel={stopPan}
        >
          <rect width={W} height={H} fill="#eaf0e9" />
          {tiles.map(tile => (
            <image key={tile.key} href={tile.url} x={tile.x} y={tile.y} width={tileSize} height={tileSize} />
          ))}
          {points.length > 1 && points.slice(0, -1).map((pt, i) => (
            <line
              key={i}
              x1={pt.x} y1={pt.y}
              x2={points[i + 1].x} y2={points[i + 1].y}
              stroke="#c0392b"
              strokeWidth="2"
              strokeDasharray="6 4"
              opacity="0.75"
            />
          ))}
          {points.map((pt, i) => (
            <g key={i} transform={`translate(${pt.x},${pt.y})`}>
              <circle r="12" fill="#c0392b" />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10"
                fontWeight="700"
                fill="white"
              >
                {i + 1}
              </text>
            </g>
          ))}
        </svg>
        <div className="planner-map-controls" aria-label="Map zoom controls">
          <button type="button" aria-label="Zoom in" onClick={() => changeZoom(1)} disabled={zoom >= 18}>+</button>
          <button type="button" aria-label="Zoom out" onClick={() => changeZoom(-1)} disabled={zoom <= 11}>−</button>
        </div>
      </div>

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
        {' '}Map tiles © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>.
      </p>
    </div>
  );
}

function worldX(lng, zoom) {
  return ((lng + 180) / 360) * 256 * (2 ** zoom);
}

function worldY(lat, zoom) {
  const limitedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sin = Math.sin(limitedLat * Math.PI / 180);
  return (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * 256 * (2 ** zoom);
}

function fitZoom(stops) {
  const valid = stops.filter(stop => Number.isFinite(stop.lat) && Number.isFinite(stop.lng));
  if (valid.length < 2) return 15;
  const xs = valid.map(stop => worldX(stop.lng, 0));
  const ys = valid.map(stop => worldY(stop.lat, 0));
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const zoomX = spanX > 0 ? Math.log2(600 * 0.8 / spanX) : 18;
  const zoomY = spanY > 0 ? Math.log2(300 * 0.8 / spanY) : 18;
  return Math.max(11, Math.min(18, Math.floor(Math.min(zoomX, zoomY))));
}

