import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { EmptyState } from "@/components/ui/States";
import { ShieldAlert } from "lucide-react";

/** Client-side routing guard for UX only — the API enforces every permission. */
export function RequireAuth({ children }) {
  const { user, signedOut } = useAuth();
  const location = useLocation();
  // Remember where an unauthenticated visitor was headed, but not after an explicit sign-out.
  if (!user) return <Navigate to="/login" replace state={signedOut ? null : { from: location.pathname + location.search }} />;
  return <>{children}</>;
}

export function RequireRole({ roles, children }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-6 w-6" />}
        title="This page isn't available for your role"
        hint="If you think you should have access, contact your administrator."
      />
    );
  }
  return <>{children}</>;
}

export function RedirectIfAuthed({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const from = location.state?.from;
  if (user) return <Navigate to={from && from.startsWith("/app") ? from : "/app"} replace />;
  return <>{children}</>;
}
