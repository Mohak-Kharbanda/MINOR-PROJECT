import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu as MenuIcon, Moon, Sun, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { ACCOUNT_ITEM, NAV } from "./nav";

function NavLinks({ items, onNavigate }) {
  return (
    <nav className="space-y-1" aria-label="Main">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate} className="block">
          {({ isActive }) => (
            <span
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "text-ink" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl border border-brand/20 bg-brand-soft"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
              <item.icon className={cn("relative h-[18px] w-[18px]", isActive && "text-brand")} />
              <span className="relative">{item.label}</span>
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function ThemeToggle({ className }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface text-ink-muted transition hover:text-ink",
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: -18, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 18, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.2 }}
        >
          {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-6">
        <NavLink to="/" onClick={onNavigate}>
          <Logo />
        </NavLink>
      </div>
      <div className="flex-1 overflow-y-auto px-3">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Workspace</p>
        <NavLinks items={NAV[user.role]} onNavigate={onNavigate} />
        <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">You</p>
        <NavLinks items={[ACCOUNT_ITEM]} onNavigate={onNavigate} />
      </div>
      <div className="m-3 rounded-2xl border border-line bg-surface-2/60 p-3">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-ink-faint">{user.email}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <RoleBadge role={user.role} />
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <button
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
              aria-label="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink-muted transition hover:border-danger/40 hover:text-danger"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="min-h-screen">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-[480px] w-[620px] rounded-full bg-brand/10 blur-[120px]" />
        <div className="absolute -bottom-40 right-0 h-[420px] w-[520px] rounded-full bg-accent/10 blur-[120px]" />
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-line bg-surface/80 backdrop-blur-xl lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <NavLink to="/app">
          <Logo />
        </NavLink>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 w-[86%] max-w-[300px] border-r border-line bg-surface"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
            >
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-5 rounded-lg p-1.5 text-ink-muted hover:bg-surface-2"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main className="lg:pl-[264px]">
        {/* Keyed by path so each page plays its entrance animation. */}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
