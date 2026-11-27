import { useEffect, useRef, useState } from 'react';

export const CATEGORIES = [
  'Faith & heritage',
  'City spaces',
  'Culture & history',
  'Nature & outdoors',
];

export const PACE_OPTIONS = [
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'active', label: 'Active' },
];

export const TRANSPORT_OPTIONS = [
  { value: 'walk', label: 'Walk' },
  { value: 'public', label: 'Public transport' },
  { value: 'private', label: 'Private vehicle' },
];

export const DEFAULT_FORM = {
  budget: '1500',
  days: '1',
  people: '1',
  hours: '6',
  pace: 'balanced',
  transport: 'public',
  startDate: '',
  foodPerPersonDay: '0',
  lodgingPerNight: '0',
  preferences: [],
};

const BUDGET_MAX = 1000000;
const BUDGET_SLIDER_MAX = 50000;

const PENDING_KEY = 'lakbaynaga.planner.pending';
const EDIT_KEY = 'lakbaynaga.itinerary.edit';

function loadSavedTrip() {
  try {
    const raw = sessionStorage.getItem(EDIT_KEY);
    if (!raw) return null;
    const trip = JSON.parse(raw);
    if (typeof trip?.id !== 'string' || !trip.plan?.settings ||
        !Array.isArray(trip.plan.stops) || !Array.isArray(trip.plan.days) ||
        !trip.plan.days.length || !trip.plan.totals) return null;
    return trip;
  } catch { return null; }
}

export function savePendingForm(values) {
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(values)); } catch { /* ignore */ }
}

export function loadPendingForm() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function hasPendingForm() {
  try { return Boolean(sessionStorage.getItem(PENDING_KEY)); } catch { return false; }
}

function settingsFromValues(values) {
  return {
    budget: values.budget === '' ? '' : Number(values.budget),
    hours: values.hours === '' ? '' : Number(values.hours),
    days: values.days === '' ? '' : Number(values.days),
    people: values.people === '' ? '' : Number(values.people),
    pace: values.pace,
    transport: values.transport,
    preferences: values.preferences,
    foodPerPersonDay: values.foodPerPersonDay === '' ? '' : Number(values.foodPerPersonDay),
    lodgingPerNight: values.lodgingPerNight === '' ? '' : Number(values.lodgingPerNight),
    ...(values.startDate ? { startDate: values.startDate } : {}),
  };
}

export function formatPHP(amount) {
  if (!Number.isFinite(amount) || amount < 0) return '—';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP', maximumFractionDigits: 2,
  }).format(amount);
}

export function formatMinutes(total) {
  if (!Number.isFinite(total) || total <= 0) return '0 min';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

// Backend startMinutes offsets are shown from 9:00 AM, as documented by the API.
export function minutesToTime(minutes, startHour = 9) {
  const total = startHour * 60 + minutes;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const period = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function distanceBetween(a, b) {
  if (![a.lat, a.lng, b.lat, b.lng].every(Number.isFinite)) return 0;
  const radians = value => value * Math.PI / 180;
  const dlat = radians(b.lat - a.lat);
  const dlng = radians(b.lng - a.lng);
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dlng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function withoutStop(plan, stopId) {
  const transfer = { walk: 45, public: 30, private: 20 }[plan.settings.transport] ?? 30;
  const fare = { walk: 0, public: 50, private: 100 }[plan.settings.transport] ?? 50;
  const people = plan.settings.people;
  let minutes = 0;
  let distanceKm = 0;
  const days = plan.days.map(day => {
    let elapsed = 0;
    let dayDistance = 0;
    const stops = day.stops.filter(stop => stop.id !== stopId).map((stop, index, list) => {
      if (index) {
        elapsed += transfer;
        dayDistance += distanceBetween(list[index - 1], stop);
      }
      const next = { ...stop, startMinutes: elapsed };
      elapsed += stop.duration;
      return next;
    });
    const dayMinutes = stops.reduce((sum, stop) => sum + stop.duration, 0) + Math.max(0, stops.length - 1) * transfer;
    minutes += dayMinutes;
    distanceKm += dayDistance;
    return { ...day, stops, minutes: dayMinutes, distanceKm: Math.round(dayDistance * 10) / 10 };
  });
  const stops = days.flatMap(day => day.stops);
  const excludedPlaceIds = [...new Set([...(plan.settings.excludedPlaceIds || []), stopId])];
  const admissions = stops.reduce((sum, stop) => sum + Math.round(stop.cost * 100) * people, 0) / 100;
  const transportAllowance = stops.length * fare * people;
  const total = admissions + transportAllowance + plan.totals.food + plan.totals.lodging;
  return {
    ...plan,
    settings: { ...plan.settings, excludedPlaceIds },
    days,
    stops,
    totals: {
      ...plan.totals,
      admissions,
      transportAllowance,
      total,
      remaining: plan.settings.budget - total,
      minutes,
      distanceKm: Math.round(distanceKm * 10) / 10,
    },
  };
}

export { BUDGET_MAX, BUDGET_SLIDER_MAX };

export function usePlannerForm() {
  const [initial] = useState(() => {
    const trip = loadSavedTrip();
    const settings = trip?.plan?.settings;
    return {
      trip,
      values: settings ? {
        ...DEFAULT_FORM,
        budget: String(settings.budget),
        days: String(settings.days),
        people: String(settings.people),
        hours: String(settings.hours),
        pace: settings.pace,
        transport: settings.transport,
        startDate: settings.startDate || '',
        foodPerPersonDay: String(settings.foodPerPersonDay),
        lodgingPerNight: String(settings.lodgingPerNight),
        preferences: settings.preferences || [],
      } : loadPendingForm() ?? DEFAULT_FORM,
    };
  });
  const [savedTrip, setSavedTrip] = useState(initial.trip);
  const [values, setValues] = useState(initial.values);
  const [result, setResult] = useState(initial.trip?.plan ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const revision = useRef(0);

  useEffect(() => {
    try { sessionStorage.removeItem(PENDING_KEY); sessionStorage.removeItem(EDIT_KEY); } catch { /* unavailable storage */ }
    return () => { revision.current += 1; };
  }, []);

  function update(name, value) {
    revision.current += 1;
    setResult(null);
    setValues(current => ({ ...current, [name]: value }));
    setError('');
  }

  function togglePreference(category) {
    revision.current += 1;
    setResult(null);
    setValues(current => {
      const has = current.preferences.includes(category);
      return {
        ...current,
        preferences: has
          ? current.preferences.filter(c => c !== category)
          : [...current.preferences, category],
      };
    });
    setError('');
  }

  async function generate(onNeedLogin) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');

    setResult(null);
    const requestRevision = revision.current;
    const body = settingsFromValues(values);

    try {
      const response = await fetch('/api/itineraries/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (requestRevision !== revision.current) return;

      if (response.status === 401) {
        savePendingForm(values);
        submitting.current = false;
        setBusy(false);
        onNeedLogin('planner');
        return;
      }

      const data = await response.json();
      if (requestRevision !== revision.current) return;
      if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
      setResult(data);
    } catch (err) {
      if (requestRevision !== revision.current) return;
      if (err instanceof TypeError || err instanceof SyntaxError) {
        setError('Unable to connect. Please check your connection and try again.');
      } else {
        setError(err.message);
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  function acceptSavedTrip(trip) {
    setSavedTrip(trip);
    setResult(trip.plan);
  }

  function removeStop(stopId) {
    setResult(current => current ? withoutStop(current, stopId) : current);
  }

  return { values, update, togglePreference, generate, result, busy, error, savedTrip, acceptSavedTrip, removeStop };
}
