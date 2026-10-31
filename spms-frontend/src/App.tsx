import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { RedirectIfAuthed, RequireAuth, RequireRole } from "@/components/layout/Guards";
import { LogoMark } from "@/components/ui/Logo";
import { PageSkeleton } from "@/components/ui/States";
import Landing from "@/pages/Landing";
import Login from "@/pages/auth/Login";

// Route-level code splitting keeps the first load small.
const Register = lazy(() => import("@/pages/auth/Register"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));
const Dashboard = lazy(() => import("@/pages/shared/Dashboard"));
const ProjectWorkspace = lazy(() => import("@/pages/shared/ProjectWorkspace"));
const ProjectsList = lazy(() => import("@/pages/shared/ProjectsList"));
const TeamsProgress = lazy(() => import("@/pages/shared/TeamsProgress"));
const Account = lazy(() => import("@/pages/shared/Account"));
const TeamPage = lazy(() => import("@/pages/student/TeamPage"));
const MyProject = lazy(() => import("@/pages/student/MyProject"));
const Users = lazy(() => import("@/pages/admin/Users"));
const Departments = lazy(() => import("@/pages/admin/Departments"));
const FacultyWorkload = lazy(() => import("@/pages/admin/FacultyWorkload"));
const AuditLog = lazy(() => import("@/pages/admin/AuditLog"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <LogoMark className="h-12 w-12 animate-pulse" />
      <p className="text-sm text-ink-faint">Loading EduTrack…</p>
    </div>
  );
}

export default function App() {
  const { initializing } = useAuth();
  if (initializing) return <Splash />;

  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
        <Route path="/register" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Suspense fallback={<PageSkeleton />}><Dashboard /></Suspense>} />
          <Route path="projects/:id" element={<Suspense fallback={<PageSkeleton />}><ProjectWorkspace /></Suspense>} />
          <Route path="account" element={<Suspense fallback={<PageSkeleton />}><Account /></Suspense>} />

          <Route path="team" element={<RequireRole roles={["student"]}><Suspense fallback={<PageSkeleton />}><TeamPage /></Suspense></RequireRole>} />
          <Route path="my-project" element={<RequireRole roles={["student"]}><Suspense fallback={<PageSkeleton />}><MyProject /></Suspense></RequireRole>} />

          <Route path="projects" element={<RequireRole roles={["faculty", "admin"]}><Suspense fallback={<PageSkeleton />}><ProjectsList /></Suspense></RequireRole>} />
          <Route path="teams" element={<RequireRole roles={["faculty", "admin"]}><Suspense fallback={<PageSkeleton />}><TeamsProgress /></Suspense></RequireRole>} />

          <Route path="users" element={<RequireRole roles={["admin"]}><Suspense fallback={<PageSkeleton />}><Users /></Suspense></RequireRole>} />
          <Route path="departments" element={<RequireRole roles={["admin"]}><Suspense fallback={<PageSkeleton />}><Departments /></Suspense></RequireRole>} />
          <Route path="faculty" element={<RequireRole roles={["admin"]}><Suspense fallback={<PageSkeleton />}><FacultyWorkload /></Suspense></RequireRole>} />
          <Route path="audit" element={<RequireRole roles={["admin"]}><Suspense fallback={<PageSkeleton />}><AuditLog /></Suspense></RequireRole>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
