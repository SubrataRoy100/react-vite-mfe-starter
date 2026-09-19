import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { sendMfeEvent } from "@subrataroy100/mfe-shared";


/**
 * Fallback card rendered when a federated remote module fails to load or crashes.
 * Prevents the host shell container from crashing.
 */
function RemoteErrorFallback({ error, resetErrorBoundary, remoteName = "Remote Service", serviceName }) {
  const devTarget =
    serviceName || remoteName.toLowerCase().replace(/[^a-z0-9]/g, "");

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
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition active:scale-95 cursor-pointer"
            >
              <span>🔄</span>
              <span>Retry Component</span>
            </button>
            <span className="text-[11px] text-slate-500">
              Ensure the remote dev server is running, or boot via <code className="px-1 py-0.5 rounded bg-rose-100 text-rose-800 font-mono text-[10px]">pnpm dev</code> / <code className="px-1 py-0.5 rounded bg-rose-100 text-rose-800 font-mono text-[10px]">pnpm dev:only {devTarget}</code>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Isolated Error Boundary for Micro-Frontends with enterprise telemetry forwarding.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.remoteName] Display name of the micro-frontend
 * @param {string} [props.serviceName] Package name of the service
 * @param {() => void} [props.onReset] Reset callback
 * @param {(error: Error, info: { componentStack?: string }, payload: object) => void} [props.onError] Local error handler
 */
export function RemoteErrorBoundary({
  children,
  remoteName = "Remote Service",
  serviceName,
  onReset,
  onError,
}) {
  const handleError = (error, info) => {
    const payload = {
      remoteName,
      serviceName: serviceName || remoteName.toLowerCase().replace(/[^a-z0-9]/g, ""),
      error: error?.message || String(error),
      stack: error?.stack,
      componentStack: info?.componentStack,
      timestamp: Date.now(),
      url: typeof window !== "undefined" ? window.location?.href : "",
    };

    // 1. Invoke local prop onError if provided
    try {
      onError?.(error, info, payload);
    } catch (err) {
      console.error("[RemoteErrorBoundary] onError handler threw:", err);
    }

    // 2. Invoke global telemetry handler (e.g. Sentry / Datadog integration)
    if (typeof window !== "undefined" && typeof window.__MFE_TELEMETRY_HANDLER__ === "function") {
      try {
        window.__MFE_TELEMETRY_HANDLER__(payload);
      } catch (err) {
        console.error("[RemoteErrorBoundary] Global telemetry handler threw:", err);
      }
    }

    // 3. Broadcast decoupled event across the MFE event bus
    try {
      sendMfeEvent("mfe:telemetry:error", payload);
    } catch {
      // Best-effort telemetry
    }
  };

  return (
    <ErrorBoundary
      fallbackRender={(props) => (
        <RemoteErrorFallback {...props} remoteName={remoteName} serviceName={serviceName} />
      )}
      onReset={onReset}
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
}

export default RemoteErrorBoundary;
