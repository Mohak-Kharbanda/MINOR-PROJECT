export default async function globalTeardown() {
  const server = globalThis.__MONGOD__;
  if (server) await server.stop();
}
