import mongoose from 'mongoose';


const attractionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  {
    collection: 'attractions'
  }
);


export const Attraction =
  mongoose.models.Attraction ||
  mongoose.model('Attraction', attractionSchema);