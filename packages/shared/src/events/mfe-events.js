import { useEffect, useRef, useState, useCallback } from "react";
import {
  MFE_EVENTS,
  sendMfeEvent,
  listenMfeEvent,
  getMfeState,
  setMfeState,
  listenMfeState,
  clearMfeEventStore,
  createMfeEventBus as createCoreEventBus,
} from "./mfe-events-core.js";

export {
  MFE_EVENTS,
  sendMfeEvent,
  listenMfeEvent,
  getMfeState,
  setMfeState,
  listenMfeState,
  clearMfeEventStore,
};

/**
 * React hook to listen for MFE events cleanly with automated cleanup.
 * Stabilized against inline function recreation using a ref so it does not
 * resubscribe across re-renders. Supports opt-in event replay for late mounting.
 *
 * @param {string} eventName
 * @param {(detail: any) => void} handler
 * @param {object} [options]
 * @param {boolean} [options.replayLast=false] Immediately invoke handler with last emitted payload if available
 */
export function useMfeEventListener(eventName, handler, options = {}) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const replayLast = Boolean(options?.replayLast);

  useEffect(() => {
    return listenMfeEvent(
      eventName,
      (detail) => {
        handlerRef.current?.(detail);
      },
      { replayLast }
    );
  }, [eventName, replayLast]);
}

/**
 * React hook to synchronize reactive cross-MFE shared state.
 * Automatically synchronizes across all micro-frontends reading or updating the same key.
 *
 * @template T
 * @param {string} key
 * @param {T} [initialValue]
 * @returns {[T, (newValue: T | ((prev: T) => T)) => void]}
 */
export function useMfeEventState(key, initialValue) {
  const [val, setVal] = useState(() => {
    const existing = getMfeState(key);
    return existing !== undefined ? existing : initialValue;
  });

  useEffect(() => {
    return listenMfeState(key, (newVal) => {
      setVal(newVal);
    });
  }, [key]);

  const updateState = useCallback(
    (newValue) => {
      const resolvedValue =
        typeof newValue === "function" ? newValue(getMfeState(key)) : newValue;
      setMfeState(key, resolvedValue);
    },
    [key]
  );

  return [val, updateState];
}

/**
 * Creates a scoped event bus factory that includes React hooks (`useListener`, `useState`).
 *
 * @param {object} [options]
 * @param {string} [options.sender] Default sender identifier
 * @param {string} [options.namespace] Optional namespace prefix
 * @returns {{
 *   sender: string,
 *   namespace: string | null,
 *   resolveEventName: (eventName: string) => string,
 *   send: (eventName: string, payload?: any) => void,
 *   listen: (eventName: string, handler: (detail: any) => void, options?: { replayLast?: boolean }) => () => void,
 *   setState: (key: string, value: any) => void,
 *   getState: (key: string) => any,
 *   listenState: (key: string, handler: (value: any, detail: any) => void) => () => void,
 *   useListener: (eventName: string, handler: (detail: any) => void, options?: { replayLast?: boolean }) => void,
 *   useState: <T>(key: string, initialValue?: T) => [T, (newValue: T | ((prev: T) => T)) => void]
 * }}
 */
export function createMfeEventBus(options = {}) {
  const coreBus = createCoreEventBus(options);
  const namespace = coreBus.namespace;

  return {
    ...coreBus,
    useListener(eventName, handler, listenOptions = {}) {
      const resolvedName = coreBus.resolveEventName(eventName);
      useMfeEventListener(resolvedName, handler, listenOptions);
    },
    useState(key, initialValue) {
      const resolvedKey = namespace ? `${namespace}:${key}` : key;
      return useMfeEventState(resolvedKey, initialValue);
    },
  };
}
