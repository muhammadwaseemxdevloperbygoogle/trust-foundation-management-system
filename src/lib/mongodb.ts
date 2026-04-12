import mongoose from "mongoose"
import { ensureAdminUserExists } from "@/src/lib/admin-seed"

const MONGODB_URI = process.env.MONGODB_URI

type CachedMongoose = {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

const globalWithMongoose = global as typeof globalThis & {
  mongoose?: CachedMongoose
}

const cached = globalWithMongoose.mongoose || { conn: null, promise: null }
globalWithMongoose.mongoose = cached

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable")
  }

  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false })
  }
  cached.conn = await cached.promise
  await ensureAdminUserExists()
  return cached.conn
}
