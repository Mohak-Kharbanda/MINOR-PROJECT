/**
 * Runs a real MongoDB server locally without installing MongoDB, using the
 * binary that mongodb-memory-server downloads on first run. Data persists in
 * <repo>/.data/mongo between runs. Development only.
 *
 *   npm run db:local          # then use MONGODB_URI=mongodb://127.0.0.1:27017/edutrack
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MongoMemoryServer } from "mongodb-memory-server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const dbPath = path.resolve(__dirname, "..", "..", ".data", "mongo");
  fs.mkdirSync(dbPath, { recursive: true });
  const port = Number(process.env.LOCAL_DB_PORT || 27017);

  const server = await MongoMemoryServer.create({
    instance: { port, ip: "127.0.0.1", dbPath, storageEngine: "wiredTiger" },
  });
  console.log(`[local-db] MongoDB ready at mongodb://127.0.0.1:${port}/edutrack`);
  console.log(`[local-db] data directory: ${dbPath}`);

  const stop = async () => {
    console.log("[local-db] stopping…");
    await server.stop({ doCleanup: false });
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  setInterval(() => undefined, 1 << 30);
}

main().catch((err) => {
  console.error("[local-db] failed to start:", err);
  process.exit(1);
});
