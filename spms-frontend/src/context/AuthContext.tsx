import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthPayload, UserDTO } from "@edutrack/shared/types";
import { api, refreshSession, setAccessToken, setSessionExpiredHandler } from "@/lib/api";

interface AuthContextValue {
  user: UserDTO | null;
  initializing: boolean;
  /** True right after an explicit sign-out, so the next sign-in starts fresh. */
  signedOut: boolean;
  login: (email: string, password: string) => Promise<UserDTO>;
  register: (payload: Record<string, unknown>) => Promise<UserDTO>;
  logout: () => Promise<void>;
  setSession: (payload: { accessToken?: string; user?: UserDTO }) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const queryClient = useQueryClient();

  const clear = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setSessionExpiredHandler(clear);
  }, [clear]);

  // Silent refresh on load: the httpOnly cookie restores the session.
  useEffect(() => {
    let cancelled = false;
    refreshSession()
      .then(() => api.get("/auth/me"))
      .then((res) => !cancelled && setUser(res.data.data.user))
      .catch(() => undefined)
      .finally(() => !cancelled && setInitializing(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = useCallback((payload: AuthPayload) => {
    setSignedOut(false);
    setAccessToken(payload.accessToken);
    setUser(payload.user);
    return payload.user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      signedOut,
      login: async (email, password) => apply((await api.post("/auth/login", { email, password })).data.data),
      register: async (payload) => apply((await api.post("/auth/register", payload)).data.data),
      logout: async () => {
        await api.post("/auth/logout").catch(() => undefined);
        setSignedOut(true);
        clear();
      },
      setSession: ({ accessToken, user: next }) => {
        if (accessToken) setAccessToken(accessToken);
        if (next) setUser(next);
      },
    }),
    [user, initializing, signedOut, apply, clear]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
