import { useEffect, useRef } from "react";
import {
  MFE_EVENTS,
  sendMfeEvent,
  listenMfeEvent,
  createMfeEventBus as createCoreEventBus,
} from "./mfe-events-core.js";

export { MFE_EVENTS, sendMfeEvent, listenMfeEvent };

/**
 * React hook to listen for MFE events cleanly with automated cleanup.
 * Stabilized against inline function recreation using a ref so it does not
 * resubscribe across re-renders.
 *
 * @param {string} eventName
 * @param {(detail: any) => void} handler
 */
export function useMfeEventListener(eventName, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return listenMfeEvent(eventName, (detail) => {
      handlerRef.current?.(detail);
    });
  }, [eventName]);
}

/**
 * Creates a scoped event bus factory that includes the React `useListener` hook.
 *
 * @param {object} [options]
 * @param {string} [options.sender] Default sender identifier
 * @param {string} [options.namespace] Optional namespace prefix
 * @returns {{
 *   sender: string,
 *   namespace: string | null,
 *   resolveEventName: (eventName: string) => string,
 *   send: (eventName: string, payload?: any) => void,
 *   listen: (eventName: string, handler: (detail: any) => void) => () => void,
 *   useListener: (eventName: string, handler: (detail: any) => void) => void
 * }}
 */
export function createMfeEventBus(options = {}) {
  const coreBus = createCoreEventBus(options);
  return {
    ...coreBus,
    useListener(eventName, handler) {
      const resolvedName = coreBus.resolveEventName(eventName);
      useMfeEventListener(resolvedName, handler);
    },
  };
}
