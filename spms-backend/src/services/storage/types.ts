export interface StoredObject {
  driver: "cloudinary" | "s3" | "local";
  key: string;
  resourceType?: string;
  format?: string;
}

export interface PutInput {
  buffer: Buffer;
  /** Folder-like prefix, e.g. "projects/<projectId>" */
  prefix: string;
  filename: string;
  mimeType: string;
}

export interface SignedUrlInput {
  object: StoredObject;
  filename: string;
  mimeType: string;
  disposition: "inline" | "attachment";
  ttlSeconds: number;
}

/**
 * Storage drivers keep every file private. Clients never get a permanent
 * public URL: after the API checks project access it hands out a short-lived
 * signed URL for one file.
 */
export interface StorageDriver {
  readonly name: StoredObject["driver"];
  put(input: PutInput): Promise<StoredObject>;
  signedUrl(input: SignedUrlInput): Promise<string>;
  remove(object: StoredObject): Promise<void>;
}

export function safeFilename(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w.\- ]+/g, "")
      .replace(/\s+/g, "_")
      .slice(-120) || "file"
  );
}

export function contentDisposition(disposition: "inline" | "attachment", filename: string): string {
  const ascii = safeFilename(filename);
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
