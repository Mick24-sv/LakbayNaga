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


export function makeMongoAuthStore({ models = {} } = {}) {
  const userModel = models.User || User;
  const sessionModel = models.Session || Session;
  const resetModel = models.PasswordReset || PasswordReset;
  return {
    async initialize() {
      await userModel.createIndexes();
      await sessionModel.createIndexes();
      await resetModel.createIndexes();
    },


    async userByEmail(email) {
      const user = await userModel.findOne({
        email: email.trim().toLowerCase()
      }).lean();


      return account(user);
    },


    async userById(id) {
      if (!mongoose.isObjectIdOrHexString(id)) return null;


      return account(await userModel.findById(id).lean());
    },


    async addUser(data) {
      // Only explicitly allowed account fields reach MongoDB.
      const user = await userModel.create({
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
      return account(await userModel.findOne({ googleId }).lean());
    },

    async linkGoogleId(userId, googleId) {
      return account(await userModel.findByIdAndUpdate(userId, { $set: { googleId } }, { returnDocument: 'after' }).lean());
    },

    async createPasswordReset(digest, record) {
      await resetModel.create({ digest, userId: String(record.userId), expiresAt: new Date(record.expiresAt) });
    },

    async consumePasswordReset(digest) {
      const row = await resetModel.findOneAndDelete({ digest, expiresAt: { $gt: new Date() } }).lean();
      return row ? account(await userModel.findById(row.userId).lean()) : null;
    },

    async updateProfile(userId, { firstName, lastName }) {
      return account(await userModel.findByIdAndUpdate(userId, { $set: { firstName, lastName } }, { returnDocument: 'after', runValidators: true }).lean());
    },

    async setPassword(userId, passwordHash, expectedHash) {
      const filter = { _id: userId };
      if (expectedHash !== undefined) filter.passwordHash = expectedHash;
      return account(await userModel.findOneAndUpdate(filter, { $set: { passwordHash } }, { returnDocument: 'after', runValidators: true }).lean());
    },


    async putSession(digest, session) {
      await sessionModel.updateOne(
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
      const session = await sessionModel.findOne({
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
      await sessionModel.deleteOne({ digest });
    },

    async revokeUserSessions(userId) {
      await sessionModel.deleteMany({ userId: String(userId) });
    }
  };
}
