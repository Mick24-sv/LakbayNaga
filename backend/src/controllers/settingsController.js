import {
  SettingsInputError,
  validateSettings
} from '../services/settingsService.js';

export function createSettingsController(repository) {
  return {
    async get(_req, res) {
      res.json(await repository.get());
    },

    async update(req, res) {
      try {
        const settings = validateSettings(req.body);
        res.json(await repository.save(settings));
      } catch (error) {
        if (error instanceof SettingsInputError) {
          return res.status(400).json({ error: error.message });
        }
        throw error;
      }
    }
  };
}
