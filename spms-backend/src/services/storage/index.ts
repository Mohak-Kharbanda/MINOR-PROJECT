import { env } from "../../config/env";
import { StorageDriver, StoredObject } from "./types";
import { LocalStorage } from "./local";

let instance: StorageDriver | null = null;
const byName = new Map<string, StorageDriver>();

function create(name: StoredObject["driver"]): StorageDriver {
  // Cloud SDKs are loaded lazily so a deployment only needs the one it uses.
  if (name === "cloudinary") {
    const { CloudinaryStorage } = require("./cloudinary") as typeof import("./cloudinary");
    return new CloudinaryStorage();
  }
  if (name === "s3") {
    const { S3Storage } = require("./s3") as typeof import("./s3");
    return new S3Storage();
  }
  return new LocalStorage();
}

/** The driver new uploads go to. */
export function getStorage(): StorageDriver {
  if (!instance) {
    instance = create(env.storage.driver);
    byName.set(instance.name, instance);
  }
  return instance;
}

/** The driver an existing file was stored with (it may differ after a migration). */
export function storageFor(object: StoredObject): StorageDriver {
  const existing = byName.get(object.driver);
  if (existing) return existing;
  const driver = create(object.driver);
  byName.set(object.driver, driver);
  return driver;
}

export function setStorageForTests(driver: StorageDriver | null) {
  instance = driver;
  byName.clear();
  if (driver) byName.set(driver.name, driver);
}

export * from "./types";
