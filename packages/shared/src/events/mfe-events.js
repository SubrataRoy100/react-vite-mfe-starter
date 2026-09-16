import { useEffect } from "react";

/**
 * Standard event names for Cross-MFE messaging
 */
export const MFE_EVENTS = {
  PING: "mfe:ping",
  PONG: "mfe:pong",
  NOTIFICATION: "mfe:notification",
  NAVIGATION: "mfe:navigation",
};

/**
 * Dispatch an event from any MFE (Host or Remote)
 * @param {string} eventName
 * @param {any} payload
 */
export function sendMfeEvent(eventName, payload = {}) {
  if (typeof window === "undefined") return;

  const defaultSender =
    window.__MFE_NAME__ ||
    (window.__IS_HOST__ ? "Host Shell" : "Remote Micro-Frontend");

  const event = new CustomEvent(eventName, {
    detail: {
      ...payload,
      timestamp: Date.now(),
      sender: payload.sender || defaultSender,
    },
  });
  window.dispatchEvent(event);
}

/**
 * React hook to listen for MFE events cleanly with automated cleanup
 * @param {string} eventName
 * @param {(detail: any) => void} handler
 */
export function useMfeEventListener(eventName, handler) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const listener = (event) => {
      if (event instanceof CustomEvent && handler) {
        handler(event.detail);
      }
    };

    window.addEventListener(eventName, listener);
    return () => window.removeEventListener(eventName, listener);
  }, [eventName, handler]);
}
