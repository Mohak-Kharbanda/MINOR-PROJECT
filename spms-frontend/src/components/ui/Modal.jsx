import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

function useLockBodyAndEscape(open, onClose) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
}

function useAutoFocus(open) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    const t = setTimeout(() => {
      const target = ref.current?.querySelector("[data-autofocus], input:not([type=hidden]), textarea, select, button:not([data-close])");
      (target ?? ref.current)?.focus();
    }, 60);
    return () => {
      clearTimeout(t);
      previouslyFocused?.focus?.();
    };
  }, [open]);
  return ref;
}

const WIDTHS = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

export function Modal({ open, onClose, title, description, children, footer, size = "md" }) {
  useLockBodyAndEscape(open, onClose);
  const ref = useAutoFocus(open);
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            className={cn(
              "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl outline-none sm:rounded-3xl",
              WIDTHS[size]
            )}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
              </div>
              <button data-close onClick={onClose} className="rounded-lg p-1.5 text-ink-faint transition hover:bg-surface-2 hover:text-ink" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface-2/50 px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function Drawer({ open, onClose, title, children, width = "max-w-2xl" }) {
  useLockBodyAndEscape(open, onClose);
  const ref = useAutoFocus(open);
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            ref={ref}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            className={cn("relative flex h-full w-full flex-col border-l border-line bg-surface shadow-2xl outline-none", width)}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
              <div className="min-w-0 flex-1">{typeof title === "string" ? <h2 className="truncate text-lg font-semibold">{title}</h2> : title}</div>
              <button data-close onClick={onClose} className="rounded-lg p-1.5 text-ink-faint transition hover:bg-surface-2 hover:text-ink" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
