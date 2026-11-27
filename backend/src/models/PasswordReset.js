import mongoose from 'mongoose';

const passwordResetSchema = new mongoose.Schema({
  digest: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 }
}, { collection: 'password_resets' });

export const PasswordReset = mongoose.models.PasswordReset || mongoose.model('PasswordReset', passwordResetSchema);
