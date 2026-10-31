import { createApp } from "./app";
import { connectDB, disconnectDB } from "./config/db";
import { env } from "./config/env";
import { bootstrapFirstAdmin } from "./services/bootstrap";

async function main() {
  await connectDB();
  await bootstrapFirstAdmin();
  const app = createApp();
  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] EduTrack API listening on http://localhost:${env.port} (${env.nodeEnv}, storage: ${env.storage.driver})`);
  });

  const shutdown = (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`[server] ${signal} received, shutting down…`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[server] failed to start:", err);
  process.exit(1);
});
