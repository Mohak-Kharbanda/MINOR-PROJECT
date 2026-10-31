
import { motion } from "framer-motion";
import { Compass } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { Aurora } from "@/components/landing/PublicNav";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <Aurora />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative text-center">
        <Compass className="mx-auto h-12 w-12 text-brand" />
        <p className="mt-6 font-display text-7xl font-extrabold text-gradient">404</p>
        <h1 className="mt-2 text-2xl font-bold">This page wandered off</h1>
        <p className="mt-2 text-ink-muted">The link may be old, or you may not have access to it.</p>
        <LinkButton to="/" className="mt-6">Back home</LinkButton>
      </motion.div>
    </div>
  );
}
