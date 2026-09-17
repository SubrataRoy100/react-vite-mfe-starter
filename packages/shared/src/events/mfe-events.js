import { useEffect, useRef } from "react";
import {
  MFE_EVENTS,
  sendMfeEvent,
  listenMfeEvent,
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


