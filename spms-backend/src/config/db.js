import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB(uri = env.mongoUri) {
  mongoose.set("strictQuery", true);
  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  if (!env.isTest) {
    // eslint-disable-next-line no-console
    console.log(`[db] connected -> ${conn.connection.name}`);
  }
  return conn;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
