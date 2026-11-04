import { filterPublicAttractions } from '../services/attractionService.js';

export function createAttractionController(attractionData) {
  return {
    listPublic(req, res) {
      const { q = '', category = '' } = req.query;
      if (typeof q !== 'string' || typeof category !== 'string') {
        return res.status(400).json({
          error: 'Search and category must be single text values.'
        });
      }
      res.json(filterPublicAttractions(attractionData, { q, category }));
    },

    listAdmin(req, res) {
      res.json(attractionData);
    }
  };
}
