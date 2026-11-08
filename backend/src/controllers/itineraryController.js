import { InputError, planItinerary } from '../services/plannerService.js';

export function createItineraryController(attractionRepository) {
  return {
    async generate(req, res) {
      try {
        const places = await attractionRepository.all();
        res.json(planItinerary(req.body, places));
      } catch (error) {
        if (error instanceof InputError) {
          return res.status(400).json({ error: error.message });
        }
        throw error;
      }
    }
  };
}
