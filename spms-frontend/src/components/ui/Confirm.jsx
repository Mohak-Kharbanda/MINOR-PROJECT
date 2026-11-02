import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

const ConfirmContext = createContext(null);

/** `const confirm = useConfirm(); if (await confirm({...})) { ... }` — used before every destructive action. */
export function ConfirmProvider({ children }) {
  const [opts, setOpts] = useState(null);
  const resolver = useRef();

  const confirm = useCallback((o) => {
    setOpts(o);
    return new Promise((resolve) => (resolver.current = resolve));
  }, []);

  const close = (value) => {
    resolver.current?.(value);
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={Boolean(opts)}
        onClose={() => close(false)}
        size="sm"
        title={
          <span className="flex items-center gap-2">
            {opts?.tone !== "primary" && <AlertTriangle className="h-5 w-5 text-danger" />}
            {opts?.title}
          </span>
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button data-autofocus variant={opts?.tone === "primary" ? "primary" : "danger"} onClick={() => close(true)}>
              {opts?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      >
        <div className="text-sm leading-relaxed text-ink-muted">{opts?.message}</div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}
