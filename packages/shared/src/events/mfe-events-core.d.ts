export interface MfeEventPayload {
  message?: string;
  sender?: string;
  timestamp?: number;
  namespace?: string | null;
  [key: string]: unknown;
}

export interface MfePingDetail extends MfeEventPayload {
  count?: number;
}

export interface MfePongDetail extends MfeEventPayload {
  tickCount?: number;
  memory?: string;
}

export interface MfeNotificationDetail extends MfeEventPayload {
  message: string;
}

/**
 * Default event map for standard Micro-Frontend events.
 */
export interface MfeDefaultEventMap {
  "mfe:ping": MfePingDetail;
  "mfe:pong": MfePongDetail;
  "mfe:notification": MfeNotificationDetail;
  "mfe:navigation": MfeEventPayload;
}

/**
 * Extensible interface allowing applications and teams to declare custom events
 * via TypeScript module augmentation:
 *
 * declare module "@subrataroy100/mfe-shared" {
 *   interface MfeEventRegistry {
 *     "billing:invoice_generated": { invoiceId: string; amount: number };
 *   }
 * }
 */
export interface MfeEventRegistry {}

export type MfeEventMap = MfeDefaultEventMap & MfeEventRegistry;

export const MFE_EVENTS: {
  readonly PING: "mfe:ping";
  readonly PONG: "mfe:pong";
  readonly NOTIFICATION: "mfe:notification";
  readonly NAVIGATION: "mfe:navigation";
};

export interface EventBusOptions {
  sender?: string;
  namespace?: string;
}

export interface MfeListenOptions {
  replayLast?: boolean;
}

export interface ScopedCoreEventBus {
  readonly sender: string;
  readonly namespace: string | null;
  resolveEventName(eventName: string): string;
  send<K extends keyof MfeEventMap>(eventName: K, payload?: MfeEventMap[K]): void;
  send<T extends MfeEventPayload = MfeEventPayload>(eventName: string, payload?: T): void;
  listen<K extends keyof MfeEventMap>(
    eventName: K,
    handler: (detail: MfeEventMap[K] & MfeEventPayload) => void,
    options?: MfeListenOptions
  ): () => void;
  listen<T = MfeEventPayload>(
    eventName: string,
    handler: (detail: T) => void,
    options?: MfeListenOptions
  ): () => void;
  setState<T = any>(key: string, value: T): void;
  getState<T = any>(key: string): T | undefined;
  listenState<T = any>(key: string, handler: (value: T, detail: any) => void): () => void;
}

export declare function createMfeEventBus(options?: EventBusOptions): ScopedCoreEventBus;

export declare function sendMfeEvent<K extends keyof MfeEventMap>(
  eventName: K,
  payload?: MfeEventMap[K]
): void;
export declare function sendMfeEvent<T extends MfeEventPayload = MfeEventPayload>(
  eventName: string,
  payload?: T
): void;

export declare function listenMfeEvent<K extends keyof MfeEventMap>(
  eventName: K,
  handler: (detail: MfeEventMap[K] & MfeEventPayload) => void,
  options?: MfeListenOptions
): () => void;
export declare function listenMfeEvent<T = MfeEventPayload>(
  eventName: string,
  handler: (detail: T) => void,
  options?: MfeListenOptions
): () => void;

export declare function getMfeState<T = any>(key: string): T | undefined;
export declare function setMfeState<T = any>(key: string, value: T, sender?: string): void;
export declare function listenMfeState<T = any>(
  key: string,
  handler: (value: T, detail: any) => void
): () => void;
export declare function clearMfeEventStore(): void;
