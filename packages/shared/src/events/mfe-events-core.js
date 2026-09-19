/**
 * Standard event names for Cross-MFE messaging across all frameworks.
 */
export const MFE_EVENTS = {
  PING: "mfe:ping",
  PONG: "mfe:pong",
  NOTIFICATION: "mfe:notification",
  NAVIGATION: "mfe:navigation",
};

/**
 * Dispatch an event from any MFE (Host or Remote).
 * Pure JavaScript, runtime-agnostic, with runtime payload validation.
 *
 * @param {string} eventName
 * @param {object} [payload={}]
 */
export function sendMfeEvent(eventName, payload = {}) {
  if (typeof window === "undefined") return;

  if (typeof eventName !== "string" || eventName.trim() === "") {
    throw new Error("[mfe-events] sendMfeEvent requires a valid non-empty string eventName.");
  }

  const safePayload = typeof payload === "object" && payload !== null ? payload : { data: payload };

  const defaultSender =
    window.__IS_HOST__ ? "Host Shell" : (window.__MFE_NAME__ || "Remote Micro-Frontend");

  const event = new CustomEvent(eventName, {
    detail: {
      ...safePayload,
      timestamp: Date.now(),
      sender: safePayload.sender || defaultSender,
    },
  });
  window.dispatchEvent(event);
}

/**
 * Pure Vanilla JS event listener for any framework (Vue, Svelte, Solid, Vanilla, React).
 * Returns an unsubscribe cleanup function.
 *
 * @param {string} eventName
 * @param {(detail: any) => void} handler
 * @returns {() => void} Unsubscribe function
 */
export function listenMfeEvent(eventName, handler) {
  if (typeof window === "undefined") return () => {};

  if (typeof eventName !== "string" || eventName.trim() === "") {
    throw new Error("[mfe-events] listenMfeEvent requires a valid non-empty string eventName.");
  }

  const listener = (event) => {
    if (event instanceof CustomEvent && typeof handler === "function") {
      try {
        handler(event.detail);
      } catch (err) {
        console.error(
          `[mfe-events] Error executing listener for "${eventName}":`,
          err
        );
      }
    }
  };

  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}

/**
 * Creates a scoped event bus instance bound to an explicit sender and optional namespace.
 * Eliminates global name conflicts and sender overwrites when multiple remotes run concurrently.
 *
 * @param {object} [options]
 * @param {string} [options.sender] Explicit sender identifier (e.g. "authMfe", "marketingMfe")
 * @param {string} [options.namespace] Optional namespace prefix (e.g. "checkout")
 * @returns {{
 *   sender: string,
 *   namespace: string | null,
 *   resolveEventName: (eventName: string) => string,
 *   send: (eventName: string, payload?: any) => void,
 *   listen: (eventName: string, handler: (detail: any) => void) => () => void
 * }}
 */
export function createMfeEventBus(options = {}) {
  const sender =
    options?.sender ||
    (typeof window !== "undefined"
      ? (window.__IS_HOST__ ? "Host Shell" : "Remote Micro-Frontend")
      : "Remote Micro-Frontend");
  const namespace = options?.namespace || null;

  function resolveEventName(eventName) {
    if (!namespace || eventName.startsWith(`${namespace}:`)) {
      return eventName;
    }
    return `${namespace}:${eventName}`;
  }

  function send(eventName, payload = {}) {
    const resolvedName = resolveEventName(eventName);
    const safePayload = typeof payload === "object" && payload !== null ? payload : { data: payload };
    sendMfeEvent(resolvedName, {
      ...safePayload,
      sender: safePayload.sender || sender,
      namespace: safePayload.namespace || namespace,
    });
  }

  function listen(eventName, handler) {
    const resolvedName = resolveEventName(eventName);
    return listenMfeEvent(resolvedName, handler);
  }

  return {
    sender,
    namespace,
    resolveEventName,
    send,
    listen,
  };
}
