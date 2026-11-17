import {
  SettingsInputError,
  validateSettings
} from '../services/settingsService.js';

export function createSettingsController(repository, imageRepository) {
  return {
    async get(_req, res) {
      res.json(await repository.get());
    },

    async update(req, res) {
      try {
        const settings = validateSettings(req.body);
        for (const value of Object.values(settings)) {
          if (value && !await imageRepository.exists(value.split('/').at(-1))) {
            throw new SettingsInputError('Uploaded image was not found.');
          }
        }
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
