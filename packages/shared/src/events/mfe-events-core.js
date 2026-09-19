/**
 * Standard event names for Cross-MFE messaging across all frameworks.
 */
export const MFE_EVENTS = {
  PING: "mfe:ping",
  PONG: "mfe:pong",
  NOTIFICATION: "mfe:notification",
  NAVIGATION: "mfe:navigation",
};

// Internal in-memory stores for event replay and shared cross-MFE state
const _retainedEvents = new Map();
const _stateStore = new Map();

/**
 * Dispatch an event from any MFE (Host or Remote).
 * Pure JavaScript, runtime-agnostic, with runtime payload validation and event retention.
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

  const detail = {
    ...safePayload,
    timestamp: Date.now(),
    sender: safePayload.sender || defaultSender,
  };

  // Retain the latest event for opt-in late-subscriber replay
  _retainedEvents.set(eventName, detail);

  const event = new CustomEvent(eventName, { detail });
  window.dispatchEvent(event);
}

/**
 * Pure Vanilla JS event listener for any framework (Vue, Svelte, Solid, Vanilla, React).
 * Supports opt-in event replay for late-mounting micro-frontends.
 *
 * @param {string} eventName
 * @param {(detail: any) => void} handler
 * @param {object} [options]
 * @param {boolean} [options.replayLast=false] When true, immediately invokes handler with the last emitted payload if available
 * @returns {() => void} Unsubscribe function
 */
export function listenMfeEvent(eventName, handler, options = {}) {
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

  // Opt-in replay for late subscribers: fire immediately if an event was previously dispatched
  if (options?.replayLast && _retainedEvents.has(eventName) && typeof handler === "function") {
    try {
      handler(_retainedEvents.get(eventName));
    } catch (err) {
      console.error(
        `[mfe-events] Error executing replay for "${eventName}":`,
        err
      );
    }
  }

  return () => window.removeEventListener(eventName, listener);
}

/**
 * Retrieves the current retained value of a cross-MFE state key.
 *
 * @param {string} key
 * @returns {any}
 */
export function getMfeState(key) {
  return _stateStore.get(key);
}

/**
 * Sets a cross-MFE state key and broadcasts a change notification to all subscribers.
 *
 * @param {string} key
 * @param {any} value
 * @param {string} [sender]
 */
export function setMfeState(key, value, sender) {
  _stateStore.set(key, value);
  sendMfeEvent(`mfe:state:${key}`, {
    key,
    value,
    sender: sender || (typeof window !== "undefined" && window.__IS_HOST__ ? "Host Shell" : "Remote Micro-Frontend"),
  });
}

/**
 * Listens for cross-MFE state key changes with automatic initial-value replay.
 *
 * @param {string} key
 * @param {(value: any, detail: any) => void} handler
 * @returns {() => void}
 */
export function listenMfeState(key, handler) {
  if (typeof handler !== "function") return () => {};

  // Replay current state immediately if already defined
  if (_stateStore.has(key)) {
    try {
      handler(_stateStore.get(key), { key, value: _stateStore.get(key), replayed: true });
    } catch (err) {
      console.error(`[mfe-events] Error in initial state listener for "${key}":`, err);
    }
  }

  return listenMfeEvent(`mfe:state:${key}`, (detail) => {
    handler(detail.value, detail);
  });
}

/**
 * Resets retained events and state store (primarily for unit testing and workspace isolation).
 */
export function clearMfeEventStore() {
  _retainedEvents.clear();
  _stateStore.clear();
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

  function listen(eventName, handler, listenOptions = {}) {
    const resolvedName = resolveEventName(eventName);
    return listenMfeEvent(resolvedName, handler, listenOptions);
  }

  function setState(key, value) {
    const resolvedKey = namespace ? `${namespace}:${key}` : key;
    setMfeState(resolvedKey, value, sender);
  }

  function getState(key) {
    const resolvedKey = namespace ? `${namespace}:${key}` : key;
    return getMfeState(resolvedKey);
  }

  function listenState(key, handler) {
    const resolvedKey = namespace ? `${namespace}:${key}` : key;
    return listenMfeState(resolvedKey, handler);
  }

  return {
    sender,
    namespace,
    resolveEventName,
    send,
    listen,
    setState,
    getState,
    listenState,
  };
}
