import { Setting } from '../models/Setting.js';

export function makeSettingsRepository({ persistent = false, defaults = {} } = {}) {
  let memory = {};

  return {
    async initialize() {
      if (persistent) await Setting.createIndexes();
    },

    async get() {
      if (!persistent) return { ...defaults, ...structuredClone(memory) };
      const row = await Setting.findOne({ key: 'site' }).lean();
      return { ...defaults, ...(row?.value ?? {}) };
    },

    async save(values) {
      if (!persistent) {
        memory = structuredClone(values);
        return { ...defaults, ...structuredClone(memory) };
      }
      const row = await Setting.findOneAndUpdate(
        { key: 'site' },
        { $set: { value: values } },
        { upsert: true, returnDocument: 'after', runValidators: true }
      ).lean();
      return { ...defaults, ...row.value };
    }
  };
}