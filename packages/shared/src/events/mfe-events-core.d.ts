export interface MfeEventPayload {
  message?: string;
  sender?: string;
  timestamp?: number;
  count?: number;
  [key: string]: unknown;
}

export interface MfePingDetail extends MfeEventPayload {
  count?: number;
}

export interface MfePongDetail extends MfeEventPayload {}

export const MFE_EVENTS: {
  readonly PING: "mfe:ping";
  readonly PONG: "mfe:pong";
  readonly NOTIFICATION: "mfe:notification";
  readonly NAVIGATION: "mfe:navigation";
  readonly CART_UPDATE: "mfe:cart_update";
  readonly ORDER_PLACED: "mfe:order_placed";
};

export function sendMfeEvent<T extends MfeEventPayload = MfeEventPayload>(
  eventName: string,
  payload?: T
): void;

export function listenMfeEvent<T = MfeEventPayload>(
  eventName: string,
  handler: (detail: T) => void
): () => void;
