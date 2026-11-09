import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';


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
        role: data.role
      });


      return account(user.toObject());
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
    }
  };
}