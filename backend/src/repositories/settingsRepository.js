import { Setting } from '../models/Setting.js';
import { defaultSettings } from '../services/settingsService.js';

export function makeSettingsRepository({ persistent = false, defaults = defaultSettings, model = Setting } = {}) {
  const initial = structuredClone(defaults);
  let memory = {};
  const result = values => structuredClone({ ...initial, ...values });
  return {
    async initialize() {
      if (persistent) await model.createIndexes();
    },
    async get() {
      if (!persistent) return result(memory);
      const row = await model.findOne({ key: 'site' }).lean();
      return result(row?.value ?? {});
    },
    async save(values) {
      if (!Object.keys(values).length) return this.get();
      if (!persistent) {
        memory = { ...memory, ...structuredClone(values) };
        return result(memory);
      }
      // Update only supplied fields, preserving other images and concurrent edits.
      const fields = Object.fromEntries(Object.entries(values).map(([key,value]) => ['value.' + key, value]));
      const row = await model.findOneAndUpdate(
        { key: 'site' }, { $set: fields },
        { upsert: true, returnDocument: 'after', runValidators: true }
      ).lean();
      return result(row.value);
    },
  };
}
