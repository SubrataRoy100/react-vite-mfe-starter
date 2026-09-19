/**
 * Resolves a remote micro-frontend's entry URL.
 * Priority order:
 * 1. window.__MFE_RUNTIME_CONFIG__[name] (dynamic runtime injection by edge/CDN/server)
 * 2. fallbackUrl (build-time manifest or environment default)
 *
 * @param {string} name - Remote name matching remotes.manifest.json
 * @param {string} fallbackUrl - Default entry URL
 * @returns {string} - The resolved remote URL
 */
export function resolveRemoteUrl(name, fallbackUrl) {
  if (
    typeof window !== "undefined" &&
    window.__MFE_RUNTIME_CONFIG__ &&
    typeof window.__MFE_RUNTIME_CONFIG__[name] === "string" &&
    window.__MFE_RUNTIME_CONFIG__[name].trim() !== ""
  ) {
    return window.__MFE_RUNTIME_CONFIG__[name].trim();
  }
  return fallbackUrl;
}
