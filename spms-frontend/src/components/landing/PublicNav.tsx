import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/ui/Logo";
import { LinkButton } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/layout/AppShell";
import { cn } from "@/lib/cn";

export function PublicNav({ links = true }: { links?: boolean }) {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn("fixed inset-x-0 top-0 z-40 transition-all duration-300", scrolled ? "border-b border-line bg-bg/75 backdrop-blur-xl" : "border-b border-transparent")}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="EduTrack home">
          <Logo />
        </Link>
        {links && (
          <nav className="hidden items-center gap-8 text-sm font-medium text-ink-muted md:flex">
            <a href="#features" className="transition hover:text-ink">Features</a>
            <a href="#roles" className="transition hover:text-ink">Roles</a>
            <a href="#workflow" className="transition hover:text-ink">Workflow</a>
          </nav>
        )}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <LinkButton to="/app" size="sm" icon={<ArrowRight className="h-4 w-4" />}>Open dashboard</LinkButton>
          ) : (
            <>
              <LinkButton to="/login" className="hidden sm:block" variant="ghost" size="sm">Sign in</LinkButton>
              <LinkButton to="/register" size="sm">Get started</LinkButton>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}

export function Aurora({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div className="absolute inset-0 bg-grid mask-fade-b opacity-60" />
      <div className="absolute -left-32 -top-24 h-[520px] w-[520px] animate-aurora rounded-full bg-brand/30 blur-[110px]" />
      <div className="absolute right-[-10%] top-10 h-[460px] w-[560px] animate-aurora rounded-full bg-accent/25 blur-[120px] [animation-delay:-6s]" />
      <div className="absolute bottom-[-20%] left-1/3 h-[420px] w-[520px] animate-aurora rounded-full bg-[rgb(var(--lime)/0.18)] blur-[120px] [animation-delay:-12s]" />
    </div>
  );
}
