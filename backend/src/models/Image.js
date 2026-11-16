import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    uploadedBy: { type: String, required: true }
  },
  { timestamps: true, collection: 'images' }
);

export const Image =
  mongoose.models.Image || mongoose.model('Image', imageSchema);