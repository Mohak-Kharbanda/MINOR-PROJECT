import crypto from "crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../config/env";
import { PutInput, SignedUrlInput, StorageDriver, StoredObject, contentDisposition, safeFilename } from "./types";

/**
 * AWS S3 (or any S3-compatible store: Cloudflare R2, Backblaze B2, MinIO).
 * The bucket should block all public access; downloads use presigned GETs.
 */
export class S3Storage implements StorageDriver {
  readonly name = "s3" as const;
  private client: S3Client;
  private bucket: string;

  constructor() {
    const s = env.storage.s3;
    if (!s.configured) {
      throw new Error("S3 storage selected but S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY are not set.");
    }
    this.bucket = s.bucket;
    this.client = new S3Client({
      region: s.region,
      endpoint: s.endpoint || undefined,
      forcePathStyle: s.forcePathStyle,
      credentials: { accessKeyId: s.accessKeyId, secretAccessKey: s.secretAccessKey },
    });
  }

  async put({ buffer, prefix, filename, mimeType }: PutInput): Promise<StoredObject> {
    const key = `${prefix}/${crypto.randomUUID()}-${safeFilename(filename)}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ServerSideEncryption: env.storage.s3.endpoint ? undefined : "AES256",
      })
    );
    return { driver: "s3", key };
  }

  signedUrl({ object, filename, mimeType, disposition, ttlSeconds }: SignedUrlInput): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: object.key,
        ResponseContentDisposition: contentDisposition(disposition, filename),
        ResponseContentType: mimeType,
      }),
      { expiresIn: ttlSeconds }
    );
  }

  async remove(object: StoredObject): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: object.key }));
  }
}
