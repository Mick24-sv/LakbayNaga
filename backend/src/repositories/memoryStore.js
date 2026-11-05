import { randomUUID } from 'node:crypto';


export function makeStore() {
  const users = new Map();
  const sessions = new Map();


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
    }
  };
}