import os from "os";
import path from "path";

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-0123456789abcdef";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-0123456789abcdef";
process.env.CLIENT_ORIGIN = "http://localhost:5173";
process.env.APP_URL = "http://localhost:5173";
process.env.STORAGE_DRIVER = "local";
process.env.LOCAL_UPLOAD_DIR = path.join(os.tmpdir(), `edutrack-test-uploads-${process.pid}`);
process.env.SERVE_CLIENT = "false";
process.env.TEAM_MAX_MEMBERS = "4";
process.env.SMTP_URL = "";
