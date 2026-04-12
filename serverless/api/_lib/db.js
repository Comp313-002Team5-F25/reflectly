// serverless/_lib/db.js
import mongoose from 'mongoose';

let cached = global._reflectly_mongoose;
if (!cached) {
  cached = global._reflectly_mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  // if already connected, reuse
  if (cached.conn) return cached.conn;

  const uri = (process.env.MONGODB_URI || '').trim();
  // if no URI or it's localhost (which Vercel can't reach), just skip DB
  if (!uri || uri.startsWith('mongodb://127.0.0.1') || uri.startsWith('mongodb://localhost')) {
    console.warn('[db] skipping mongo connect on serverless (no remote URI)');
    return null;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, { dbName: 'reflectly' })
      .then((m) => {
        console.log('[db] connected');
        return m;
      })
      .catch((err) => {
        console.error('[db] connect error', err.message);
        // don't rethrow — we want the API to still answer
        return null;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
