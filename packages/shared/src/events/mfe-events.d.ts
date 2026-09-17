export * from "./mfe-events-core.d.ts";

export declare function useMfeEventListener<T = import("./mfe-events-core.d.ts").MfeEventPayload>(
  eventName: string,
  handler: (detail: T) => void
): void;
