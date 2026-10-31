import { MongoMemoryServer } from "mongodb-memory-server";

// One real MongoDB server for the whole run (binary is downloaded and cached
// by mongodb-memory-server on first use). Each test file uses its own DB.
export default async function globalSetup() {
  const server = await MongoMemoryServer.create();
  (globalThis as any).__MONGOD__ = server;
  process.env.TEST_MONGO_URI = server.getUri();
}
