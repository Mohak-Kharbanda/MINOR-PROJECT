import axios from "axios";

// "/api" works for single-service deploys, the Vite dev proxy and host-level
// rewrites. Set VITE_API_URL to an absolute URL for a separately hosted API.
export const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "/api";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // sends the httpOnly refresh-token cookie
  headers: { "X-Requested-With": "XMLHttpRequest" },
  timeout: 60_000,
});

// The access token lives only in memory (never localStorage) to limit XSS
// exposure; a refresh cookie restores it after a reload.
let accessToken = null;
let onSessionExpired = () => undefined;

export function setAccessToken(token) {
  accessToken = token;
}

export function setSessionExpiredHandler(fn) {
  onSessionExpired = fn;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing = null;

export function refreshSession() {
  if (!refreshing) {
    refreshing = api
      .post("/auth/refresh")
      .then((res) => {
        setAccessToken(res.data.data.accessToken);
        return res.data.data.accessToken;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

const NO_RETRY = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/forgot-password", "/auth/reset-password"];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config;
    const url = config?.url ?? "";
    if (error.response?.status === 401 && config && !config._retried && !NO_RETRY.some((p) => url.includes(p))) {
      config._retried = true;
      try {
        const token = await refreshSession();
        config.headers.Authorization = `Bearer ${token}`;
        return api(config);
      } catch (refreshError) {
        setAccessToken(null);
        onSessionExpired();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

/** User-facing message from an API error. */
export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  const err = error;
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === "ERR_NETWORK") return "Can't reach the EduTrack server. Check your connection.";
  if (err?.code === "ECONNABORTED") return "The request took too long. Please try again.";
  return fallback;
}

/** Per-field validation messages from a 400 response, keyed by field name. */
export function fieldErrors(error) {
  const details = error?.response?.data?.details;
  const out = {};
  for (const [field, messages] of Object.entries(details?.fieldErrors ?? {})) {
    if (messages?.[0]) out[field] = messages[0];
  }
  return out;
}

/** Resolves server-relative URLs (e.g. local-storage download links) against the API origin. */
export function resolveApiUrl(url) {
  if (/^https?:\/\//.test(url)) return url;
  if (/^https?:\/\//.test(API_BASE)) return new URL(url, API_BASE).toString();
  return url;
}
