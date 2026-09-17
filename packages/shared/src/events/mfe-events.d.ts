import type {
  MfeEventMap,
  MfeEventPayload,
  ScopedCoreEventBus,
  EventBusOptions,
} from "./mfe-events-core.d.ts";

export * from "./mfe-events-core.d.ts";

export interface ScopedEventBus extends ScopedCoreEventBus {
  useListener<K extends keyof MfeEventMap>(
    eventName: K,
    handler: (detail: MfeEventMap[K] & MfeEventPayload) => void
  ): void;
  useListener<T = MfeEventPayload>(
    eventName: string,
    handler: (detail: T) => void
  ): void;
}

export declare function createMfeEventBus(options?: EventBusOptions): ScopedEventBus;

export declare function useMfeEventListener<K extends keyof MfeEventMap>(
  eventName: K,
  handler: (detail: MfeEventMap[K] & MfeEventPayload) => void
): void;
export declare function useMfeEventListener<T = MfeEventPayload>(
  eventName: string,
  handler: (detail: T) => void
): void;
