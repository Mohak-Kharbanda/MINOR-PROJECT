import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { Readable } from "stream";
import { env } from "../../config/env";
import { PutInput, SignedUrlInput, StorageDriver, StoredObject, safeFilename } from "./types";

/**
 * Cloudinary driver. Files are uploaded with type "authenticated", so they
 * cannot be fetched by guessing a URL; downloads go through time-limited
 * signed URLs generated here, server-side, with the API secret.
 */
export class CloudinaryStorage implements StorageDriver {
  readonly name = "cloudinary" as const;

  constructor() {
    const c = env.storage.cloudinary;
    if (!c.configured) {
      throw new Error("Cloudinary storage selected but CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET are not set.");
    }
    cloudinary.config({ cloud_name: c.cloudName, api_key: c.apiKey, api_secret: c.apiSecret, secure: true });
  }

  put({ buffer, prefix, filename, mimeType }: PutInput): Promise<StoredObject> {
    const isImage = mimeType.startsWith("image/");
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `${env.storage.cloudinary.folder}/${prefix}`,
          // Images keep image transformations; everything else (PDF, DOCX,
          // ZIP...) is stored byte-for-byte as a raw asset.
          resource_type: isImage ? "image" : "raw",
          type: "authenticated",
          use_filename: true,
          unique_filename: true,
          filename_override: safeFilename(filename),
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) return reject(error || new Error("Cloudinary upload failed"));
          resolve({
            driver: "cloudinary",
            key: result.public_id,
            resourceType: result.resource_type,
            format: result.format || "",
          });
        }
      );
      Readable.from(buffer).pipe(stream);
    });
  }

  async signedUrl({ object, disposition, ttlSeconds }: SignedUrlInput): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    return cloudinary.utils.private_download_url(object.key, object.format || "", {
      resource_type: object.resourceType || "raw",
      type: "authenticated",
      expires_at: expiresAt,
      attachment: disposition === "attachment",
    });
  }

  async remove(object: StoredObject): Promise<void> {
    await cloudinary.uploader.destroy(object.key, {
      resource_type: object.resourceType || "raw",
      type: "authenticated",
      invalidate: true,
    });
  }
}
