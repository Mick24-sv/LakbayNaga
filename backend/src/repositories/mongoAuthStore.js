import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { PasswordReset } from '../models/PasswordReset.js';


function account(document) {
  if (!document) return null;


  return {
    ...document,
    _id: String(document._id)
  };
}


export function makeMongoAuthStore() {
  return {
    async initialize() {
      await User.createIndexes();
      await Session.createIndexes();
      await PasswordReset.createIndexes();
    },


    async userByEmail(email) {
      const user = await User.findOne({
        email: email.trim().toLowerCase()
      }).lean();


      return account(user);
    },


    async userById(id) {
      if (!mongoose.isObjectIdOrHexString(id)) return null;


      return account(await User.findById(id).lean());
    },


    async addUser(data) {
      // Only explicitly allowed account fields reach MongoDB.
      const user = await User.create({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash: data.passwordHash,
        googleId: data.googleId,
        role: data.role
      });


      return account(user.toObject());
    },

    async userByGoogleId(googleId) {
      return account(await User.findOne({ googleId }).lean());
    },

    async linkGoogleId(userId, googleId) {
      return account(await User.findByIdAndUpdate(userId, { $set: { googleId } }, { new: true }).lean());
    },

    async createPasswordReset(digest, record) {
      await PasswordReset.create({ digest, userId: String(record.userId), expiresAt: new Date(record.expiresAt) });
    },

    async consumePasswordReset(digest) {
      const row = await PasswordReset.findOneAndDelete({ digest, expiresAt: { $gt: new Date() } }).lean();
      return row ? account(await User.findById(row.userId).lean()) : null;
    },

    async setPassword(userId, passwordHash) {
      return account(await User.findByIdAndUpdate(userId, { $set: { passwordHash } }, { new: true }).lean());
    },


    async putSession(digest, session) {
      await Session.updateOne(
        { digest },
        {
          $set: {
            userId: String(session.userId),
            expiresAt: new Date(session.expiresAt)
          }
        },
        {
          upsert: true,
          runValidators: true
        }
      );
    },


    async session(digest) {
      // Reject expired sessions immediately, even before TTL cleanup.
      const session = await Session.findOne({
        digest,
        expiresAt: { $gt: new Date() }
      }).lean();


      if (!session) return null;


      return {
        userId: session.userId,
        expiresAt: session.expiresAt.getTime()
      };
    },


    async deleteSession(digest) {
      await Session.deleteOne({ digest });
    },

    async revokeUserSessions(userId) {
      await Session.deleteMany({ userId: String(userId) });
    }
  };
}
