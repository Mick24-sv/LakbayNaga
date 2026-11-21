import { randomUUID } from 'node:crypto';


export function makeStore() {
  const users = new Map();
  const sessions = new Map();
  const resetTokens = new Map();


  return {
    ready: Promise.resolve(),


    async userByEmail(email) {
      return [...users.values()].find(user => user.email === email);
    },


    async userById(id) {
      return users.get(id);
    },


    async addUser(data) {
      const exists = [...users.values()].some(
        user => user.email === data.email
      );


      if (exists) {
        const error = new Error('Email already registered.');
        error.status = 409;
        throw error;
      }


      const user = { ...data, _id: randomUUID() };
      users.set(user._id, user);
      return user;
    },

    async userByGoogleId(googleId) {
      return [...users.values()].find(user => user.googleId === googleId) || null;
    },

    async linkGoogleId(userId, googleId) {
      const user = users.get(userId);
      if (!user) return null;
      user.googleId = googleId;
      return user;
    },

    async createPasswordReset(digest, record) {
      resetTokens.set(digest, record);
    },

    async consumePasswordReset(digest) {
      const record = resetTokens.get(digest);
      resetTokens.delete(digest);
      if (!record || record.expiresAt <= Date.now()) return null;
      return users.get(record.userId) || null;
    },

    async updateProfile(userId, { firstName, lastName }) {
      const user = users.get(userId);
      if (!user) return null;
      user.firstName = firstName;
      user.lastName = lastName;
      return user;
    },

    async setPassword(userId, passwordHash, expectedHash) {
      const user = users.get(userId);
      if (!user) return null;
      if (expectedHash !== undefined && user.passwordHash !== expectedHash) return null;
      user.passwordHash = passwordHash;
      return user;
    },


    async putSession(digest, session) {
      for (const [key, value] of sessions) {
        if (value.expiresAt <= Date.now()) sessions.delete(key);
      }
      sessions.set(digest, session);
    },


    async session(digest) {
      const session = sessions.get(digest);


      if (!session || session.expiresAt <= Date.now()) {
        sessions.delete(digest);
        return null;
      }


      return session;
    },


    async deleteSession(digest) {
      sessions.delete(digest);
    },

    async revokeUserSessions(userId) {
      for (const [digest, session] of sessions) {
        if (String(session.userId) === String(userId)) sessions.delete(digest);
      }
    }
  };
}
