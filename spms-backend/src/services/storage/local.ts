import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { env } from "../../config/env";
import { signFileToken } from "../../utils/jwt";
import { PutInput, SignedUrlInput, StorageDriver, StoredObject, safeFilename } from "./types";

/**
 * Stores files on the API server's disk. Meant for local development, tests
 * and single-server deployments with a persistent volume. Files are served
 * only through /api/storage/local/:token, where the token is a short-lived
 * JWT minted after an access check.
 */
export class LocalStorage implements StorageDriver {
  readonly name = "local" as const;

  constructor(private readonly root: string = env.storage.localDir) {}

  resolve(key: string): string {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) {
      throw new Error("Invalid storage key");
    }
    return full;
  }

  async put({ buffer, prefix, filename }: PutInput): Promise<StoredObject> {
    const key = path.posix.join(prefix, `${crypto.randomUUID()}-${safeFilename(filename)}`);
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, buffer);
    return { driver: "local", key };
  }

  async signedUrl({ object, disposition, filename, mimeType, ttlSeconds }: SignedUrlInput): Promise<string> {
    const token = signFileToken({ key: object.key, disposition, filename, mime: mimeType }, ttlSeconds);
    return `/api/storage/local/${token}`;
  }

  async remove(object: StoredObject): Promise<void> {
    await fs.rm(this.resolve(object.key), { force: true });
  }
}
