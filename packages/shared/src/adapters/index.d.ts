import type React from "react";
import type { MfeEventMap, MfeEventPayload } from "../events/mfe-events-core.d.ts";

export interface MfeLifecycleInstance {
  update?: (props: Record<string, any>) => void;
  unmount: () => void;
}

export interface MfeLifecycle<P = Record<string, any>> {
  mount: (
    container: HTMLElement | ShadowRoot,
    props?: P
  ) => MfeLifecycleInstance | (() => void) | void;
  unmount?: (container?: HTMLElement | ShadowRoot) => void;
}

export interface DualModeReactMount<P = Record<string, any>> extends React.FC<P>, MfeLifecycle<P> {
  Component: React.ComponentType<P>;
}

export interface UniversalRemoteMountProps {
  loadRemote: () => Promise<any>;
  remoteKey?: string;
  retryKey?: number | string;
  props?: Record<string, any>;
  fallback?: React.ReactNode;
  className?: string;
  remoteName?: string;
  shadowDom?: boolean | ShadowRootInit;
  onError?: (error: Error) => void;
}

export declare const UniversalRemoteMount: React.FC<UniversalRemoteMountProps>;

export declare function normalizeRemoteModule(
  mod: any
): {
  mount: (container: HTMLElement | ShadowRoot, props?: Record<string, any>) => any;
  unmount?: (container?: HTMLElement | ShadowRoot) => void;
  update?: (props: Record<string, any>) => void;
  Component?: React.ComponentType<any>;
  raw: any;
} | null;

export declare function createReactMount<P = Record<string, any>>(
  Component: React.ComponentType<P>
): DualModeReactMount<P>;

export declare function createVanillaMount(
  renderFn: (container: HTMLElement | ShadowRoot, props?: Record<string, any>) => (() => void) | void
): MfeLifecycle & { renderFn: Function };

export declare function useMfeEventListener<K extends keyof MfeEventMap>(
  eventName: K,
  handler: (detail: MfeEventMap[K] & MfeEventPayload) => void
): void;
export declare function useMfeEventListener<T = MfeEventPayload>(
  eventName: string,
  handler: (detail: T) => void
): void;
