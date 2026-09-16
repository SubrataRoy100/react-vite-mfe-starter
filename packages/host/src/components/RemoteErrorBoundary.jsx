import React from "react";
import { ErrorBoundary } from "react-error-boundary";

/**
 * Fallback card rendered when a federated remote module fails to load or crashes.
 * Prevents the host shell container from crashing.
 */
function RemoteErrorFallback({ error, resetErrorBoundary, remoteName = "Remote Service" }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-6 text-slate-800 shadow-sm my-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-rose-900">
              Failed to load {remoteName}
            </h3>
            <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold">
              MFE Boundary Isolated
            </span>
          </div>

          <p className="mt-1 text-xs text-rose-700 leading-relaxed">
            The remote micro-frontend could not be fetched or encountered a runtime exception.
            The host application shell remains healthy and operational.
          </p>

          {error?.message && (
            <div className="mt-3 p-2.5 rounded-lg bg-white/80 border border-rose-200 font-mono text-[11px] text-rose-800 overflow-x-auto">
              {error.message}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={resetErrorBoundary}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition active:scale-95"
            >
              <span>🔄</span>
              <span>Retry Component</span>
            </button>
            <span className="text-[11px] text-slate-500">
              Ensure the remote dev server is running, or boot via <code className="px-1 py-0.5 rounded bg-rose-100 text-rose-800 font-mono text-[10px]">pnpm dev</code> / <code className="px-1 py-0.5 rounded bg-rose-100 text-rose-800 font-mono text-[10px]">pnpm dev:only {remoteName.toLowerCase().replace(/\s+/g, '')}</code>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RemoteErrorBoundary({ children, remoteName = "Remote Service", onReset }) {
  return (
    <ErrorBoundary
      FallbackComponent={(props) => <RemoteErrorFallback {...props} remoteName={remoteName} />}
      onReset={onReset}
    >
      {children}
    </ErrorBoundary>
  );
}
