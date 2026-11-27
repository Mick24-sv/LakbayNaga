import { useEffect, useId, useRef, useState } from 'react';
import { CATEGORIES, PACE_OPTIONS, TRANSPORT_OPTIONS } from '../planner/plannerLogic.js';
import './EditTripDialog.css';

function valuesFromTrip(trip) {
  const settings = trip?.plan?.settings || {};
  return {
    name: trip?.name || '',
    budget: String(settings.budget ?? ''),
    startDate: settings.startDate || '',
    days: String(settings.days ?? 1),
    people: String(settings.people ?? 1),
    hours: String(settings.hours ?? 6),
    preferences: Array.isArray(settings.preferences) ? settings.preferences : [],
    pace: settings.pace || 'balanced',
    transport: settings.transport || 'public',
    foodPerPersonDay: String(settings.foodPerPersonDay ?? 0),
    lodgingPerNight: String(settings.lodgingPerNight ?? 0),
    excludedPlaceIds: Array.isArray(settings.excludedPlaceIds) ? settings.excludedPlaceIds : [],
  };
}

export default function EditTripDialog({ trip, busy, error, onCancel, onSave }) {
  const dialog = useRef(null);
  const nameInput = useRef(null);
  const [form, setForm] = useState(() => valuesFromTrip(trip));
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    nameInput.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      if (element.open) element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  function update(name, value) {
    setForm(current => ({ ...current, [name]: value }));
  }

  function toggleCategory(category) {
    setForm(current => ({
      ...current,
      preferences: current.preferences.includes(category)
        ? current.preferences.filter(item => item !== category)
        : [...current.preferences, category],
    }));
  }

  function submit(event) {
    event.preventDefault();
    if (busy) return;
    onSave({
      name: form.name.trim(),
      settings: {
        budget: Number(form.budget),
        ...(form.startDate ? { startDate: form.startDate } : {}),
        days: Number(form.days),
        people: Number(form.people),
        hours: Number(form.hours),
        preferences: form.preferences,
        pace: form.pace,
        transport: form.transport,
        foodPerPersonDay: Number(form.foodPerPersonDay),
        lodgingPerNight: Number(form.lodgingPerNight),
        excludedPlaceIds: form.excludedPlaceIds,
      },
    });
  }

  return (
    <dialog ref={dialog} className="edit-trip-dialog" aria-labelledby={titleId}
      aria-describedby={descriptionId} aria-busy={busy}
      onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
      <header className="edit-trip-heading">
        <p className="edit-trip-eyebrow">SAVED TRIP</p>
        <h2 id={titleId}>Edit itinerary</h2>
        <p id={descriptionId}>Update your trip details. The itinerary will be recalculated using the current attraction information.</p>
      </header>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label className="edit-trip-field edit-trip-name" htmlFor="edit-trip-name">
            Itinerary name
            <input ref={nameInput} id="edit-trip-name" type="text" value={form.name}
              maxLength="100" required onChange={event => update('name', event.target.value)} />
          </label>

          <div className="edit-trip-grid edit-trip-grid--three">
            <label className="edit-trip-field" htmlFor="edit-trip-budget">Group budget (₱)
              <input id="edit-trip-budget" type="number" min="0" max="1000000" step="0.01" required
                value={form.budget} onChange={event => update('budget', event.target.value)} />
            </label>
            <label className="edit-trip-field" htmlFor="edit-trip-days">Days
              <input id="edit-trip-days" type="number" min="1" max="7" step="1" required
                value={form.days} onChange={event => update('days', event.target.value)} />
            </label>
            <label className="edit-trip-field" htmlFor="edit-trip-people">Travelers
              <input id="edit-trip-people" type="number" min="1" max="20" step="1" required
                value={form.people} onChange={event => update('people', event.target.value)} />
            </label>
          </div>

          <div className="edit-trip-grid edit-trip-grid--three">
            <label className="edit-trip-field" htmlFor="edit-trip-date">Start date (optional)
              <input id="edit-trip-date" type="date" value={form.startDate}
                onChange={event => update('startDate', event.target.value)} />
            </label>
            <label className="edit-trip-field" htmlFor="edit-trip-hours">Hours per day
              <input id="edit-trip-hours" type="number" min="1" max="12" step="1" required
                value={form.hours} onChange={event => update('hours', event.target.value)} />
            </label>
            <label className="edit-trip-field" htmlFor="edit-trip-pace">Pace
              <select id="edit-trip-pace" value={form.pace} onChange={event => update('pace', event.target.value)}>
                {PACE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>

          <div className="edit-trip-grid edit-trip-grid--three">
            <label className="edit-trip-field" htmlFor="edit-trip-transport">Transport
              <select id="edit-trip-transport" value={form.transport} onChange={event => update('transport', event.target.value)}>
                {TRANSPORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="edit-trip-field" htmlFor="edit-trip-food">Food / person / day (₱)
              <input id="edit-trip-food" type="number" min="0" max="5000" step="0.01" required
                value={form.foodPerPersonDay} onChange={event => update('foodPerPersonDay', event.target.value)} />
            </label>
            <label className="edit-trip-field" htmlFor="edit-trip-lodging">Accommodation / night (₱)
              <input id="edit-trip-lodging" type="number" min="0" max="100000" step="0.01" required
                value={form.lodgingPerNight} onChange={event => update('lodgingPerNight', event.target.value)} />
            </label>
          </div>

          <fieldset className="edit-trip-interests">
            <legend>Interests <span>(leave clear to include all categories)</span></legend>
            <div>
              {CATEGORIES.map(category => (
                <label key={category}>
                  <input type="checkbox" checked={form.preferences.includes(category)}
                    onChange={() => toggleCategory(category)} />
                  {category}
                </label>
              ))}
            </div>
          </fieldset>
        </fieldset>

        {error && <p className="edit-trip-error" role="alert">{error}</p>}
        <div className="edit-trip-actions">
          <button type="button" className="edit-trip-cancel" disabled={busy} onClick={onCancel}>Cancel</button>
          <button type="submit" className="edit-trip-submit" disabled={busy}>
            {busy ? 'Saving changes…' : 'Save changes'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
