export default async function globalTeardown() {
  const server = (globalThis as any).__MONGOD__;
  if (server) await server.stop();
}
