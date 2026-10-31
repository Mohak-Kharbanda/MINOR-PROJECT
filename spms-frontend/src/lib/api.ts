import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiFailure } from "@edutrack/shared/types";

// "/api" works for single-service deploys, the Vite dev proxy and host-level
// rewrites. Set VITE_API_URL to an absolute URL for a separately hosted API.
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "/api";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // sends the httpOnly refresh-token cookie
  headers: { "X-Requested-With": "XMLHttpRequest" },
  timeout: 60_000,
});

// The access token lives only in memory (never localStorage) to limit XSS
// exposure; a refresh cookie restores it after a reload.
let accessToken: string | null = null;
let onSessionExpired: () => void = () => undefined;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setSessionExpiredHandler(fn: () => void) {
  onSessionExpired = fn;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing: Promise<string> | null = null;

export function refreshSession() {
  if (!refreshing) {
    refreshing = api
      .post("/auth/refresh")
      .then((res) => {
        setAccessToken(res.data.data.accessToken);
        return res.data.data.accessToken as string;
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
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
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
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const err = error as AxiosError<ApiFailure>;
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === "ERR_NETWORK") return "Can't reach the EduTrack server. Check your connection.";
  if (err?.code === "ECONNABORTED") return "The request took too long. Please try again.";
  return fallback;
}

/** Per-field validation messages from a 400 response, keyed by field name. */
export function fieldErrors(error: unknown): Record<string, string> {
  const details = (error as AxiosError<ApiFailure>)?.response?.data?.details;
  const out: Record<string, string> = {};
  for (const [field, messages] of Object.entries(details?.fieldErrors ?? {})) {
    if (messages?.[0]) out[field] = messages[0];
  }
  return out;
}

/** Resolves server-relative URLs (e.g. local-storage download links) against the API origin. */
export function resolveApiUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  if (/^https?:\/\//.test(API_BASE)) return new URL(url, API_BASE).toString();
  return url;
}
