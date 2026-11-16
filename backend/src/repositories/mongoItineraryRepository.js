import mongoose from 'mongoose';
import { Itinerary } from '../models/Itinerary.js';

const validId = id => mongoose.isObjectIdOrHexString(id);

function record(document) {
  if (!document) return null;
  return {
    id: String(document._id),
    ownerId: document.ownerId,
    name: document.name,
    plan: document.plan,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  };
}

export function makeMongoItineraryRepository({ model = Itinerary } = {}) {
  return {
    async initialize() {
      await model.createIndexes();
    },

    async list(ownerId) {
      const rows = await model.find({ ownerId: String(ownerId) })
        .sort({ createdAt: -1 })
        .lean();
      return rows.map(record);
    },

    async find(id, ownerId) {
      if (!validId(id)) return null;
      return record(
        await model.findOne({ _id: id, ownerId: String(ownerId) }).lean()
      );
    },

    async create(ownerId, { name, plan }) {
      const row = await model.create({
        ownerId: String(ownerId),
        name,
        plan
      });
      return record(row.toObject());
    },

    async update(id, ownerId, { name, plan }) {
      if (!validId(id)) return null;
      return record(
        await model.findOneAndUpdate(
          { _id: id, ownerId: String(ownerId) },
          { $set: { name, plan } },
          { returnDocument: 'after', runValidators: true }
        ).lean()
      );
    },

    async delete(id, ownerId) {
      if (!validId(id)) return false;
      const result = await model.deleteOne({
        _id: id,
        ownerId: String(ownerId)
      });
      return result.deletedCount === 1;
    }
  };
}