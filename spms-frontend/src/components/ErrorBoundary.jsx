import { Component } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/** Last line of defence: a crash shows a recoverable screen instead of a blank page. */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[EduTrack] UI error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-md p-8 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-warning" />
          <h1 className="mt-4 text-xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-ink-muted">The page hit an unexpected error. Reloading usually fixes it; your data is safe on the server.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-brand-ink"
          >
            <RotateCcw className="h-4 w-4" /> Reload
          </button>
        </div>
      </div>
    );
  }
}
