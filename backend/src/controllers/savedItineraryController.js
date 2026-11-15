import { InputError, planItinerary } from '../services/plannerService.js';

export function createSavedItineraryController(attractions, itineraries) {
  function handle(action) {
    return async (req, res) => {
      try {
        await action(req, res);
      } catch (error) {
        if (error instanceof InputError) {
          return res.status(400).json({ error: error.message });
        }
        throw error;
      }
    };
  }

  async function validatedTrip(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new InputError('Send a trip name and settings as a JSON object.');
    }
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 100) {
      throw new InputError('Trip name must contain 1 to 100 characters.');
    }
    if (!body.settings || typeof body.settings !== 'object' || Array.isArray(body.settings)) {
      throw new InputError('Provide the itinerary settings.');
    }
    // Recompute from current public attractions; never trust supplied stops/totals.
    const plan = planItinerary(body.settings, await attractions.all());
    if (!plan.stops.length) {
      throw new InputError('No attractions fit these settings. Adjust them before saving.');
    }
    return { name, plan };
  }

  const missing = res => res.status(404).json({ error: 'Itinerary not found.' });

  return {
    list: handle(async (req, res) => {
      res.json(await itineraries.list(String(req.user._id)));
    }),
    get: handle(async (req, res) => {
      const row = await itineraries.find(req.params.id, String(req.user._id));
      return row ? res.json(row) : missing(res);
    }),
    create: handle(async (req, res) => {
      const data = await validatedTrip(req.body);
      res.status(201).json(await itineraries.create(String(req.user._id), data));
    }),
    update: handle(async (req, res) => {
      const ownerId = String(req.user._id);
      if (!await itineraries.find(req.params.id, ownerId)) return missing(res);
      const data = await validatedTrip(req.body);
      const row = await itineraries.update(req.params.id, ownerId, data);
      return row ? res.json(row) : missing(res);
    }),
    delete: handle(async (req, res) => {
      const deleted = await itineraries.delete(req.params.id, String(req.user._id));
      return deleted ? res.status(204).end() : missing(res);
    }),
  };
}
