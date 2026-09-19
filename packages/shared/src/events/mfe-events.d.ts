import type {
  MfeEventMap,
  MfeEventPayload,
  ScopedCoreEventBus,
  EventBusOptions,
  MfeListenOptions,
} from "./mfe-events-core.d.ts";

export * from "./mfe-events-core.d.ts";

export interface ScopedEventBus extends ScopedCoreEventBus {
  useListener<K extends keyof MfeEventMap>(
    eventName: K,
    handler: (detail: MfeEventMap[K] & MfeEventPayload) => void,
    options?: MfeListenOptions
  ): void;
  useListener<T = MfeEventPayload>(
    eventName: string,
    handler: (detail: T) => void,
    options?: MfeListenOptions
  ): void;
  useState<T = any>(
    key: string,
    initialValue?: T
  ): [T, (newValue: T | ((prev: T) => T)) => void];
}

export declare function createMfeEventBus(options?: EventBusOptions): ScopedEventBus;

export declare function useMfeEventListener<K extends keyof MfeEventMap>(
  eventName: K,
  handler: (detail: MfeEventMap[K] & MfeEventPayload) => void,
  options?: MfeListenOptions
): void;
export declare function useMfeEventListener<T = MfeEventPayload>(
  eventName: string,
  handler: (detail: T) => void,
  options?: MfeListenOptions
): void;

export declare function useMfeEventState<T = any>(
  key: string,
  initialValue?: T
): [T, (newValue: T | ((prev: T) => T)) => void];
