// serverless/api/_lib/db.js
import mongoose from 'mongoose';

let cached = global._mongooseConn;
if (!cached) cached = global._mongooseConn = { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const uri = (process.env.MONGODB_URI || '').trim();
    if (!uri) throw new Error('NO_MONGODB_URI');
    cached.promise = mongoose.connect(uri, { dbName: 'reflectly' })
      .then(m => (cached.conn = m));
  }
  return cached.promise;
}
