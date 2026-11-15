import { randomUUID } from 'node:crypto';

// DB-04 can implement this same async interface with MongoDB.
// Every read/write is scoped to the authenticated owner.
export function makeItineraryRepository() {
  const records = new Map();
  const owned = (id, ownerId) => {
    const row = records.get(id);
    return row?.ownerId === String(ownerId) ? row : null;
  };

  return {
    async list(ownerId) {
      return [...records.values()]
        .filter(row => row.ownerId === String(ownerId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(row => structuredClone(row));
    },
    async find(id, ownerId) {
      return structuredClone(owned(id, ownerId));
    },
    async create(ownerId, { name, plan }) {
      const now = new Date().toISOString();
      const row = {
        id: randomUUID(), ownerId: String(ownerId), name,
        plan: structuredClone(plan), createdAt: now, updatedAt: now,
      };
      records.set(row.id, row);
      return structuredClone(row);
    },
    async update(id, ownerId, { name, plan }) {
      const previous = owned(id, ownerId);
      if (!previous) return null;
      const row = {
        ...previous, name, plan: structuredClone(plan),
        updatedAt: new Date().toISOString(),
      };
      records.set(id, row);
      return structuredClone(row);
    },
    async delete(id, ownerId) {
      if (!owned(id, ownerId)) return false;
      return records.delete(id);
    },
  };
}
