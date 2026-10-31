import path from "path";
import dotenv from "dotenv";
import { z } from "zod";
import { DEFAULT_TEAM_MAX_MEMBERS } from "@edutrack/shared";

dotenv.config();

const bool = (fallback: boolean) =>
  z
    .enum(["true", "false", "1", "0", ""])
    .optional()
    .transform((v) => (v === undefined || v === "" ? fallback : v === "true" || v === "1"));

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.string().url().default("http://localhost:5173"),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  SERVE_CLIENT: bool(true),
  CLIENT_DIST_DIR: z.string().optional(),

  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/edutrack"),

  JWT_ACCESS_SECRET: z.string().min(1).default("dev-access-secret-change-me"),
  JWT_REFRESH_SECRET: z.string().min(1).default("dev-refresh-secret-change-me"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  COOKIE_SECURE: bool(false),

  ALLOW_STUDENT_SIGNUP: bool(true),
  DEMO_MODE: bool(false),
  TEAM_MAX_MEMBERS: z.coerce.number().int().min(1).max(20).default(DEFAULT_TEAM_MAX_MEMBERS),

  STORAGE_DRIVER: z.enum(["cloudinary", "s3", "local"]).optional(),
  LOCAL_UPLOAD_DIR: z.string().default("uploads"),
  CLOUDINARY_CLOUD_NAME: z.string().default(""),
  CLOUDINARY_API_KEY: z.string().default(""),
  CLOUDINARY_API_SECRET: z.string().default(""),
  CLOUDINARY_FOLDER: z.string().default("edutrack"),
  S3_BUCKET: z.string().default(""),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().default(""),
  S3_SECRET_ACCESS_KEY: z.string().default(""),
  S3_ENDPOINT: z.string().default(""),
  S3_FORCE_PATH_STYLE: bool(false),

  SMTP_URL: z.string().default(""),
  MAIL_FROM: z.string().default("EduTrack <no-reply@edutrack.local>"),

  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  AUTH_RATE_LIMIT_WINDOW_MIN: z.coerce.number().int().positive().default(15),
});

// Treat blank values (e.g. `STORAGE_DRIVER=` copied from .env.example) as unset.
const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v.trim() !== ""));
const parsed = schema.safeParse(raw);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("[env] invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration. See the errors above and .env.example.");
}
const e = parsed.data;

const isProduction = e.NODE_ENV === "production";
const isTest = e.NODE_ENV === "test";

const cloudinaryConfigured = Boolean(e.CLOUDINARY_CLOUD_NAME && e.CLOUDINARY_API_KEY && e.CLOUDINARY_API_SECRET);
const s3Configured = Boolean(e.S3_BUCKET && e.S3_ACCESS_KEY_ID && e.S3_SECRET_ACCESS_KEY);

// Pick a storage driver: explicit setting wins; otherwise use whichever cloud
// provider is configured, falling back to local disk (fine for development).
const storageDriver: "cloudinary" | "s3" | "local" =
  e.STORAGE_DRIVER ?? (cloudinaryConfigured ? "cloudinary" : s3Configured ? "s3" : "local");

if (e.STORAGE_DRIVER === "cloudinary" && !cloudinaryConfigured) {
  throw new Error("STORAGE_DRIVER=cloudinary but CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are not all set.");
}
if (e.STORAGE_DRIVER === "s3" && !s3Configured) {
  throw new Error("STORAGE_DRIVER=s3 but S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are not all set.");
}

if (isProduction) {
  if (storageDriver === "local") {
    // eslint-disable-next-line no-console
    console.warn("[env] STORAGE_DRIVER=local in production: uploads live on this server's disk. Use a persistent volume, or Cloudinary/S3 on hosts with ephemeral disks (Render, Railway, Heroku).");
  }
  const weak = ["dev-access-secret-change-me", "dev-refresh-secret-change-me", "change-this"];
  for (const [name, value] of [
    ["JWT_ACCESS_SECRET", e.JWT_ACCESS_SECRET],
    ["JWT_REFRESH_SECRET", e.JWT_REFRESH_SECRET],
  ] as const) {
    if (value.length < 32 || weak.some((w) => value.startsWith(w))) {
      throw new Error(`${name} must be set to a random string of at least 32 characters in production.`);
    }
  }
  if (e.JWT_ACCESS_SECRET === e.JWT_REFRESH_SECRET) {
    throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.");
  }
}

export const env = {
  nodeEnv: e.NODE_ENV,
  isProduction,
  isTest,
  port: e.PORT,
  appUrl: e.APP_URL.replace(/\/$/, ""),
  clientOrigins: e.CLIENT_ORIGIN.split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean),
  serveClient: e.SERVE_CLIENT,
  clientDistDir: path.resolve(e.CLIENT_DIST_DIR || path.join(process.cwd(), "..", "spms-frontend", "dist")),

  mongoUri: e.MONGODB_URI,

  jwt: {
    accessSecret: e.JWT_ACCESS_SECRET,
    refreshSecret: e.JWT_REFRESH_SECRET,
    accessExpiresIn: e.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: e.JWT_REFRESH_EXPIRES_IN,
  },
  cookie: {
    sameSite: e.COOKIE_SAMESITE,
    // SameSite=None requires Secure; production always uses Secure.
    secure: isProduction || e.COOKIE_SECURE || e.COOKIE_SAMESITE === "none",
  },

  allowStudentSignup: e.ALLOW_STUDENT_SIGNUP,
  demoMode: e.DEMO_MODE,
  teamMaxMembers: e.TEAM_MAX_MEMBERS,

  storage: {
    driver: storageDriver,
    localDir: path.resolve(e.LOCAL_UPLOAD_DIR),
    cloudinary: {
      configured: cloudinaryConfigured,
      cloudName: e.CLOUDINARY_CLOUD_NAME,
      apiKey: e.CLOUDINARY_API_KEY,
      apiSecret: e.CLOUDINARY_API_SECRET,
      folder: e.CLOUDINARY_FOLDER,
    },
    s3: {
      configured: s3Configured,
      bucket: e.S3_BUCKET,
      region: e.S3_REGION,
      accessKeyId: e.S3_ACCESS_KEY_ID,
      secretAccessKey: e.S3_SECRET_ACCESS_KEY,
      endpoint: e.S3_ENDPOINT,
      forcePathStyle: e.S3_FORCE_PATH_STYLE,
    },
  },

  firstAdmin: {
    name: process.env.FIRST_ADMIN_NAME?.trim() || "System Admin",
    email: process.env.FIRST_ADMIN_EMAIL?.trim().toLowerCase() || "",
    password: process.env.FIRST_ADMIN_PASSWORD || "",
  },

  mail: {
    smtpUrl: e.SMTP_URL,
    from: e.MAIL_FROM,
    configured: Boolean(e.SMTP_URL),
  },

  authRateLimit: {
    max: e.AUTH_RATE_LIMIT_MAX,
    windowMin: e.AUTH_RATE_LIMIT_WINDOW_MIN,
  },
};
