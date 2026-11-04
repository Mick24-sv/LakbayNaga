import mongoose from 'mongoose';


const sessionSchema = new mongoose.Schema(
  {
    digest: {
      type: String,
      required: true,
      unique: true
    },
    userId: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0
    }
  },
  {
    collection: 'sessions'
  }
);


export const Session =
  mongoose.models.Session || mongoose.model('Session', sessionSchema);