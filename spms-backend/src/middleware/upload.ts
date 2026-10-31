import path from "path";
import multer from "multer";
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@edutrack/shared";
import { ApiError } from "../utils/ApiError";

/** Lower-cased extension without the dot, e.g. "pdf". */
export function extensionOf(filename: string): string {
  return path.extname(filename).slice(1).toLowerCase();
}

// Files are buffered in memory (max 25 MB, one file per request) and handed
// to the storage driver; nothing touches the API server's disk unless the
// local driver is in use.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1, fields: 10 },
  fileFilter: (_req, file, cb) => {
    const ext = extensionOf(file.originalname);
    const allowedMimes = ALLOWED_FILE_TYPES[ext];
    if (!allowedMimes) {
      return cb(ApiError.badRequest(`Files of type ".${ext || "unknown"}" are not allowed.`) as any);
    }
    if (!allowedMimes.includes(file.mimetype) && file.mimetype !== "application/octet-stream") {
      return cb(ApiError.badRequest(`The file content type (${file.mimetype}) does not match ".${ext}".`) as any);
    }
    cb(null, true);
  },
});
