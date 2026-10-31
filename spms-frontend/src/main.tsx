import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ConfirmProvider } from "@/components/ui/Confirm";
import { queryClient } from "@/lib/queryClient";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {/* Honour the OS "reduce motion" setting for every animation. */}
        <MotionConfig reducedMotion="user">
          <BrowserRouter>
            <AuthProvider>
              <ConfirmProvider>
                <App />
                <Toaster
                  position="top-right"
                  toastOptions={{
                    className: "!rounded-2xl !border !border-line !bg-surface !text-ink !shadow-lift !text-sm",
                    success: { iconTheme: { primary: "rgb(var(--success))", secondary: "white" } },
                    error: { iconTheme: { primary: "rgb(var(--danger))", secondary: "white" }, duration: 5000 },
                  }}
                />
              </ConfirmProvider>
            </AuthProvider>
          </BrowserRouter>
        </MotionConfig>
      </ThemeProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
