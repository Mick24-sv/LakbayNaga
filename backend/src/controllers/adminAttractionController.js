import { randomUUID } from 'node:crypto';
import {
  AttractionInputError,
  requireObject,
  readBoolean,
  validateAttraction
} from '../services/adminAttractionService.js';


export function createAdminAttractionController(repository) {
  async function findAttraction(id) {
    const places = await repository.all();
    return places.find(place => place.id === id);
  }


  function handle(action) {
    return async (req, res) => {
      try {
        await action(req, res);
      } catch (error) {
        if (error instanceof AttractionInputError) {
          return res.status(400).json({ error: error.message });
        }


        throw error;
      }
    };
  }


  return {
    create: handle(async (req, res) => {
      const data = validateAttraction(req.body);


      const attraction = await repository.put({
        ...data,
        id: randomUUID(),
        archived: false
      });


      res.status(201).json(attraction);
    }),


    update: handle(async (req, res) => {
      const existing = await findAttraction(req.params.id);


      if (!existing) {
        return res.status(404).json({
          error: 'Attraction not found.'
        });
      }


      requireObject(req.body);


      const data = validateAttraction({
        ...existing,
        ...req.body
      });


      const attraction = await repository.put({
        ...existing,
        ...data,
        id: existing.id,
        archived: existing.archived === true,
        published: existing.archived ? false : data.published
      });


      res.json(attraction);
    }),


    publish: handle(async (req, res) => {
      const published = readBoolean(req.body, 'published');
      const existing = await findAttraction(req.params.id);


      if (!existing) {
        return res.status(404).json({
          error: 'Attraction not found.'
        });
      }


      if (existing.archived && published) {
        return res.status(400).json({
          error: 'Restore the attraction before publishing it.'
        });
      }


      // Check required details before making a record public.
      if (published) {
        validateAttraction(existing);
      }


      res.json(await repository.put({
        ...existing,
        published
      }));
    }),


    archive: handle(async (req, res) => {
      const archived = readBoolean(req.body, 'archived');
      const existing = await findAttraction(req.params.id);


      if (!existing) {
        return res.status(404).json({
          error: 'Attraction not found.'
        });
      }


      res.json(await repository.put({
        ...existing,
        archived,
        // Restored attractions remain unpublished until approved.
        published: false
      }));
    })
  };
}