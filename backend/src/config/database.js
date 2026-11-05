import mongoose from 'mongoose';


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