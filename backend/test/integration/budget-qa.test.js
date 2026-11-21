import test from 'node:test';
import assert from 'node:assert/strict';
import { planItinerary, InputError } from '../../src/services/plannerService.js';
const places = [0, 1, 2, 3, 4, 5].map(index => ({ id: 'qa-' + index, name: 'QA ' + index, cost: [0, 0.29, 12.5, 50, 99.99, 250][index], duration: [15, 30, 45, 60, 90, 120][index], category: index % 2 ? 'Culture & history' : 'City spaces', published: true, archived: false, lat: 13.62 + index / 100, lng: 123.19 }));

test('QA-01: budget components match independent cent calculations across 189 combinations', () => {
  let cases = 0;
  for (const days of [1, 2, 7]) for (const people of [1, 3, 20]) for (const transport of ['walk', 'public', 'private']) for (const budget of [0, 0.87, 100, 500, 1500, 10000, 100000]) {
    const food = budget >= 10000 ? 12.5 : 0;
    const lodging = budget >= 10000 ? 99.99 : 0;
    const input = { budget, days, people, hours: 6, foodPerPersonDay: food, lodgingPerNight: lodging, transport, startDate: '2028-02-27', excludedPlaceIds: ['qa-5'] };
    const plan = planItinerary(input, places);
    const admissionCents = plan.stops.reduce((sum, stop) => sum + Math.round(places.find(p => p.id === stop.id).cost * 100) * people, 0);
    const transportCents = plan.stops.length * ({ walk: 0, public: 5000, private: 10000 }[transport]) * people;
    const foodCents = Math.round(food * 100) * people * days;
    const lodgingCents = Math.round(lodging * 100) * (days - 1);
    const totalCents = admissionCents + transportCents + foodCents + lodgingCents;
    assert.equal(plan.totals.admissions, admissionCents / 100);
    assert.equal(plan.totals.transportAllowance, transportCents / 100);
    assert.equal(plan.totals.food, foodCents / 100);
    assert.equal(plan.totals.lodging, lodgingCents / 100);
    assert.equal(plan.totals.total, totalCents / 100);
    assert.equal(plan.totals.remaining, (Math.floor(budget * 100 + 1e-7) - totalCents) / 100);
    assert.ok(plan.totals.total <= budget);
    assert.equal(new Set(plan.stops.map(p => p.id)).size, plan.stops.length);
    assert.ok(plan.stops.every(p => p.id !== 'qa-5'));
    assert.ok(plan.days.every(day => day.minutes <= input.hours * 60 && day.stops.every(stop => stop.startMinutes + stop.duration <= input.hours * 60)));
    cases++;
  }
  assert.equal(cases, 189);
});

test('QA-01: calendar limits and leap-year dates produce valid full-trip dates', () => {
  assert.throws(() => planItinerary({ budget: 100, hours: 6, days: 2, startDate: '9999-12-31' }, places), InputError);
  assert.equal(planItinerary({ budget: 100, hours: 6, days: 1, startDate: '9999-12-31' }, places).days[0].date, '9999-12-31');
  assert.deepEqual(planItinerary({ budget: 1000, hours: 6, days: 3, startDate: '2028-02-28' }, places).days.map(day => day.date), ['2028-02-28', '2028-02-29', '2028-03-01']);
});
