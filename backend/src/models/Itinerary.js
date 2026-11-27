import mongoose from 'mongoose';

const itinerarySchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    plan: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { timestamps: true, collection: 'itineraries' }
);

itinerarySchema.index({ ownerId: 1, createdAt: -1 });

export const Itinerary =
  mongoose.models.Itinerary || mongoose.model('Itinerary', itinerarySchema);