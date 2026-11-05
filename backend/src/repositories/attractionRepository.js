import { Attraction } from '../models/Attraction.js';


export function makeAttractionRepository({
  persistent = false,
  initialData = []
} = {}) {
  const memory = new Map(
    initialData.map(place => [place.id, structuredClone(place)])
  );


  return {
    async initialize() {
      if (persistent) {
        // Enforce the model's unique attraction ID index.
        await Attraction.createIndexes();
      }
    },


    async all() {
      if (persistent) {
        const documents = await Attraction.find()
          .sort({ id: 1 })
          .lean();


        return documents.map(document => ({
          ...document.data,
          id: document.id
        }));
      }


      return [...memory.values()].map(place => structuredClone(place));
    },


    async put(place) {
      if (!place || typeof place.id !== 'string' || !place.id.trim()) {
        throw new Error('An attraction ID is required.');
      }


      if (persistent) {
        await Attraction.updateOne(
          { id: place.id },
          {
            $set: {
              data: place
            }
          },
          {
            upsert: true,
            runValidators: true
          }
        );
      } else {
        memory.set(place.id, structuredClone(place));
      }


      return place;
    },


    async insertMissing(places) {
      let inserted = 0;


      for (const place of places) {
        if (!place || typeof place.id !== 'string' || !place.id.trim()) {
          throw new Error('Every seed attraction needs an ID.');
        }


        if (persistent) {
          const result = await Attraction.updateOne(
            { id: place.id },
            {
              $setOnInsert: {
                id: place.id,
                data: place
              }
            },
            {
              upsert: true,
              runValidators: true
            }
          );


          inserted += result.upsertedCount || 0;
        } else if (!memory.has(place.id)) {
          memory.set(place.id, structuredClone(place));
          inserted += 1;
        }
      }


      return inserted;
    }
  };
}