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
 * Pure Vanilla JS event listener for any framework (Vue, Svelte, Solid, Vanilla, React).
 * Returns an unsubscribe cleanup function.
 *
 * @param {string} eventName
 * @param {(detail: any) => void} handler
 * @returns {() => void} Unsubscribe function
 */
export function listenMfeEvent(eventName, handler) {
  if (typeof window === "undefined") return () => {};

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
 * React hook to listen for MFE events cleanly with automated cleanup
 * @param {string} eventName
 * @param {(detail: any) => void} handler
 */
export function useMfeEventListener(eventName, handler) {
  useEffect(() => {
    return listenMfeEvent(eventName, handler);
  }, [eventName, handler]);
}

