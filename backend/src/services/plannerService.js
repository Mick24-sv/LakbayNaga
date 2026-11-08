export class InputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InputError';
  }
}

const categories = new Set([
  'Faith & heritage', 'City spaces', 'Culture & history', 'Nature & outdoors'
]);

function number(value, min, max, message, integer = false) {
  if (!['number', 'string'].includes(typeof value) ||
      (typeof value === 'string' && !value.trim())) throw new InputError(message);
  const result = Number(value);
  if (!Number.isFinite(result) || result < min || result > max ||
      (integer && !Number.isInteger(result))) throw new InputError(message);
  return result;
}

export function normalizeInput(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new InputError('Enter your budget and available hours.');
  }
  const budget = number(input.budget, 0, 1000000, 'Budget must be between PHP 0 and PHP 1,000,000.');
  const hours = number(input.hours, 1, 12, 'Choose between 1 and 12 hours per day.');
  const people = number(input.people ?? 1, 1, 20, 'Choose 1 to 20 travelers.', true);
  const days = number(input.days ?? 1, 1, 7, 'Choose 1 to 7 days.', true);
  const foodPerPersonDay = number(input.foodPerPersonDay ?? 0, 0, 5000, 'Check your food allowance.');
  const lodgingPerNight = number(input.lodgingPerNight ?? 0, 0, 100000, 'Check your accommodation allowance.');
  const preferences = input.preferences ?? [];
  if (!Array.isArray(preferences) || preferences.some(value => !categories.has(value))) {
    throw new InputError('Select interests from the available attraction categories.');
  }
  const startDate = input.startDate ?? '';
  if (typeof startDate !== 'string') throw new InputError('Choose a valid start date.');
  if (startDate) {
    const date = new Date(startDate + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
        !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== startDate) {
      throw new InputError('Choose a valid start date.');
    }
  }
  const pace = input.pace ?? 'balanced';
  const transport = input.transport ?? 'public';
  if (!['relaxed', 'balanced', 'active'].includes(pace) ||
      !['walk', 'public', 'private'].includes(transport)) {
    throw new InputError('Select a valid pace and transport option.');
  }
  return { budget, hours, people, days, startDate, pace, transport,
    foodPerPersonDay, lodgingPerNight, preferences: [...new Set(preferences)] };
}

export function distanceKm(a, b) {
  if (![a.lat, a.lng, b.lat, b.lng].every(Number.isFinite)) return 0;
  const radians = value => value * Math.PI / 180;
  const dlat = radians(b.lat - a.lat);
  const dlng = radians(b.lng - a.lng);
  const h = Math.sin(dlat / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dlng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function orderStops(stops) {
  if (stops.length < 3) return stops;
  const remaining = stops.slice(1);
  const ordered = [stops[0]];
  while (remaining.length) {
    let nearest = 0;
    for (let index = 1; index < remaining.length; index++) {
      if (distanceKm(ordered.at(-1), remaining[index]) <
          distanceKm(ordered.at(-1), remaining[nearest])) nearest = index;
    }
    ordered.push(remaining.splice(nearest, 1)[0]);
  }
  return ordered;
}

// Ported from the completed system: choose affordable stops per day, then
// order them by nearby coordinates. Transfer times and fares are estimates.
export function planItinerary(input, attractions) {
  const settings = normalizeInput(input);
  const { budget, hours, people, days, startDate, pace, transport,
    foodPerPersonDay, lodgingPerNight, preferences } = settings;
  const budgetCents = Math.floor(budget * 100 + 1e-7);
  const foodCents = Math.round(foodPerPersonDay * 100) * people * days;
  const lodgingCents = Math.round(lodgingPerNight * 100) * (days - 1);
  const fixedCents = foodCents + lodgingCents;
  if (fixedCents > budgetCents) {
    throw new InputError('Food and accommodation allowances exceed the total group budget.');
  }
  const transfer = { walk: 45, public: 30, private: 20 }[transport];
  const fare = { walk: 0, public: 50, private: 100 }[transport];
  const factor = { relaxed: 1.25, balanced: 1, active: 0.85 }[pace];
  // Incomplete or invalid planning records cannot produce usable estimates.
  let pool = [...new Map(attractions.filter(place =>
    place && typeof place.id === 'string' && place.id &&
    place.published === true && !place.archived &&
    Number.isFinite(place.cost) && place.cost >= 0 &&
    Number.isFinite(place.duration) && place.duration > 0 &&
    (!preferences.length || preferences.includes(place.category))
  ).map(place => [place.id, place])).values()];
  let remainingCents = budgetCents - fixedCents;
  let totalMinutes = 0;
  let admissionsCents = 0;
  let transportCents = 0;
  const daily = [];

  for (let day = 0; day < days; day++) {
    const allowance = Math.floor(remainingCents / (days - day));
    const cap = Math.ceil(pool.length / (days - day));
    const states = new Map([['0:0', { stops: [], cost: 0, minutes: 0 }]]);
    for (const place of pool) {
      const visit = Math.ceil(place.duration * factor);
      const price = (Math.round(place.cost * 100) + fare * 100) * people;
      for (const state of [...states.values()]) {
        const cost = state.cost + price;
        const minutes = state.minutes + visit + transfer;
        if (cost > allowance || minutes > hours * 60 + transfer || state.stops.length >= cap) continue;
        const next = { stops: [...state.stops, { ...place, duration: visit }], cost, minutes };
        const key = next.stops.length + ':' + minutes;
        const previous = states.get(key);
        if (!previous || cost < previous.cost) states.set(key, next);
      }
    }
    const best = [...states.values()].sort((a, b) =>
      b.stops.length - a.stops.length || a.cost - b.cost || a.minutes - b.minutes
    )[0];
    let elapsed = 0;
    let km = 0;
    const stops = orderStops(best.stops).map((place, index, array) => {
      if (index) { elapsed += transfer; km += distanceKm(array[index - 1], place); }
      const startMinutes = elapsed;
      elapsed += place.duration;
      return { ...place, startMinutes, day: day + 1 };
    });
    const used = Math.max(0, best.minutes - transfer);
    remainingCents -= best.cost;
    totalMinutes += used;
    admissionsCents += best.stops.reduce((sum, place) => sum + Math.round(place.cost * 100) * people, 0);
    transportCents += stops.length * fare * people * 100;
    const date = startDate
      ? new Date(Date.parse(startDate + 'T00:00:00Z') + day * 86400000).toISOString().slice(0, 10)
      : '';
    daily.push({ day: day + 1, date, stops, minutes: used, distanceKm: Math.round(km * 10) / 10 });
    const chosen = new Set(stops.map(place => place.id));
    pool = pool.filter(place => !chosen.has(place.id));
  }

  const totalCents = fixedCents + admissionsCents + transportCents;
  return {
    settings,
    days: daily,
    stops: daily.flatMap(day => day.stops),
    totals: {
      admissions: admissionsCents / 100,
      transportAllowance: transportCents / 100,
      food: foodCents / 100,
      lodging: lodgingCents / 100,
      total: totalCents / 100,
      remaining: (budgetCents - totalCents) / 100,
      minutes: totalMinutes,
      distanceKm: Math.round(daily.reduce((sum, day) => sum + day.distanceKm, 0) * 10) / 10
    },
    notice: 'Planning estimates: ' + transfer + ' minutes allowed between stops; ' +
      (fare ? 'PHP ' + fare + ' per traveler per stop reserved for transport. ' : 'walking has no fare allowance. ') +
      'Distances are straight-line approximations, not road routes. Verify fares, coordinates, travel time and opening hours before visiting.'
  };
}
