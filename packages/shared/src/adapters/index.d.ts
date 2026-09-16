import type React from "react";

export interface MfeLifecycle {
  mount: (container: HTMLElement, props?: Record<string, any>) => (() => void) | void;
  unmount?: (container: HTMLElement) => void;
}

export interface UniversalRemoteMountProps {
  loadRemote: () => Promise<any>;
  props?: Record<string, any>;
  fallback?: React.ReactNode;
  className?: string;
  remoteName?: string;
  onError?: (error: Error) => void;
}

export declare const UniversalRemoteMount: React.FC<UniversalRemoteMountProps>;

export declare function createReactMount(
  Component: React.ComponentType<any>
): MfeLifecycle;

export declare function createVanillaMount(
  renderFn: (container: HTMLElement, props?: Record<string, any>) => (() => void) | void
): MfeLifecycle;
