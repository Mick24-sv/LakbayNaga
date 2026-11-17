import { randomBytes } from 'node:crypto';
import { Image } from '../models/Image.js';

export function makeImageRepository({ persistent = false, model = Image } = {}) {
  const memory = new Map();
  const copy = image => image ? { ...image, data: Buffer.from(image.data) } : null;
  return {
    async initialize() { if (persistent) await model.createIndexes(); },
    async create({ contentType, data, uploadedBy }) {
      const row = { id: randomBytes(16).toString('hex'), contentType,
        size: data.length, data: Buffer.from(data), uploadedBy: String(uploadedBy) };
      if (persistent) await model.create(row);
      else memory.set(row.id, copy(row));
      return copy(row);
    },
    async find(id) {
      if (!/^[a-f0-9]{32}$/.test(id)) return null;
      if (persistent) {
        const row = await model.findOne({ id });
        return row ? { id: row.id, contentType: row.contentType, size: row.size,
          data: Buffer.from(row.data), uploadedBy: row.uploadedBy } : null;
      }
      return copy(memory.get(id));
    },
    async exists(id) {
      return persistent ? Boolean(await model.exists({ id })) : memory.has(id);
    },
  };
}
