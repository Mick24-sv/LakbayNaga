import mongoose from 'mongoose';


// In production the API must never silently fall back to temporary memory storage.
export function requireDatabaseInProduction(env = process.env) {
  if (env.NODE_ENV === 'production' && !env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required when NODE_ENV is production.');
  }
}


export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;


  if (!uri) {
    throw new Error('MONGODB_URI is not configured.');
  }


  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    autoCreate: false,
    autoIndex: false
  });


  return mongoose.connection;
}


export async function disconnectDatabase() {
  await mongoose.disconnect();
}