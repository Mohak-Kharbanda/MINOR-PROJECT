import { env } from "../../config/env.js";
import { LocalStorage } from "./local.js";

// Cloud SDKs are loaded only when their driver is selected or configured, so a
// deployment only needs the one it uses (top-level await keeps lookups synchronous).
const needs = (name) => env.storage.driver === name || env.storage[name].configured;
const cloudDrivers = {
  cloudinary: needs("cloudinary") ? (await import("./cloudinary.js")).CloudinaryStorage : null,
  s3: needs("s3") ? (await import("./s3.js")).S3Storage : null,
};

let instance = null;
const byName = new Map();

// The same errors the drivers raise themselves when their credentials are missing.
const missingCredentials = {
  cloudinary: "Cloudinary storage selected but CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET are not set.",
  s3: "S3 storage selected but S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY are not set.",
};

function create(name) {
  if (name in cloudDrivers) {
    if (!cloudDrivers[name]) throw new Error(missingCredentials[name]);
    return new cloudDrivers[name]();
  }
  return new LocalStorage();
}

/** The driver new uploads go to. */
export function getStorage() {
  if (!instance) {
    instance = create(env.storage.driver);
    byName.set(instance.name, instance);
  }
  return instance;
}

/** The driver an existing file was stored with (it may differ after a migration). */
export function storageFor(object) {
  const existing = byName.get(object.driver);
  if (existing) return existing;
  const driver = create(object.driver);
  byName.set(object.driver, driver);
  return driver;
}

export function setStorageForTests(driver) {
  instance = driver;
  byName.clear();
  if (driver) byName.set(driver.name, driver);
}

export * from "./types.js";
