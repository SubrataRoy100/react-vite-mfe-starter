/**
 * Configure global telemetry callback for host-level error reporting (Sentry, Datadog, etc.).
 *
 * @param {object} options
 * @param {(payload: { remoteName: string, error: string, stack?: string, componentStack?: string, timestamp: number, url: string }) => void} options.onRemoteError
 */
export function setupMfeTelemetry({ onRemoteError }) {
  if (typeof window !== "undefined" && typeof onRemoteError === "function") {
    window.__MFE_TELEMETRY_HANDLER__ = onRemoteError;
  }
}
