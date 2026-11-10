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

export { BUDGET_MAX, BUDGET_SLIDER_MAX };

export function usePlannerForm() {
  const [values, setValues] = useState(() => loadPendingForm() ?? DEFAULT_FORM);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const revision = useRef(0);

  useEffect(() => {
    try { sessionStorage.removeItem(PENDING_KEY); } catch { /* unavailable storage */ }
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

  return { values, update, togglePreference, generate, result, busy, error };
}
