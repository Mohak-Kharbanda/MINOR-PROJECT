import mongoose from "mongoose";
import "../src/app"; // registers every model

beforeAll(async () => {
  const uri = process.env.TEST_MONGO_URI;
  if (!uri) throw new Error("TEST_MONGO_URI not set — globalSetup did not run.");
  const dbName = `edutrack_test_${Math.random().toString(36).slice(2, 10)}`;
  await mongoose.connect(uri, { dbName });
  // Build unique indexes up front; several tests rely on them.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).syncIndexes()));
});

afterEach(async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
