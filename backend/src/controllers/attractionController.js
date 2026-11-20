import { filterPublicAttractions } from '../services/attractionService.js';


export function createAttractionController(attractionRepository) {
  return {
    async listPublic(req, res) {
      const { q = '', category = '' } = req.query;


      if (typeof q !== 'string' || typeof category !== 'string') {
        return res.status(400).json({
          error: 'Search and category must be single text values.'
        });
      }


      if (q.length > 200 || category.length > 40) {
        return res.status(400).json({ error: 'Search must be at most 200 characters and category at most 40.' });
      }

      const places = await attractionRepository.all();


      res.json(
        filterPublicAttractions(places, {
          q,
          category
        })
      );
    },


    async listAdmin(req, res) {
      res.json(await attractionRepository.all());
    }
  };
}