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

export interface MfeCartUpdateDetail extends MfeEventPayload {
  itemCount: number;
  total: number;
}

export interface MfeOrderPlacedDetail extends MfeEventPayload {
  orderId: string;
  total: number;
  itemCount: number;
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
  "mfe:cart_update": MfeCartUpdateDetail;
  "mfe:order_placed": MfeOrderPlacedDetail;
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
  readonly CART_UPDATE: "mfe:cart_update";
  readonly ORDER_PLACED: "mfe:order_placed";
};

export interface EventBusOptions {
  sender?: string;
  namespace?: string;
}

export interface ScopedCoreEventBus {
  readonly sender: string;
  readonly namespace: string | null;
  resolveEventName(eventName: string): string;
  send<K extends keyof MfeEventMap>(eventName: K, payload?: MfeEventMap[K]): void;
  send<T extends MfeEventPayload = MfeEventPayload>(eventName: string, payload?: T): void;
  listen<K extends keyof MfeEventMap>(
    eventName: K,
    handler: (detail: MfeEventMap[K] & MfeEventPayload) => void
  ): () => void;
  listen<T = MfeEventPayload>(eventName: string, handler: (detail: T) => void): () => void;
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
  handler: (detail: MfeEventMap[K] & MfeEventPayload) => void
): () => void;
export declare function listenMfeEvent<T = MfeEventPayload>(
  eventName: string,
  handler: (detail: T) => void
): () => void;
