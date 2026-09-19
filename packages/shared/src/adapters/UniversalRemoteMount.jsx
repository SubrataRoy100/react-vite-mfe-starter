import React, { useEffect, useRef, useState, useMemo } from "react";
import { createReactMount } from "./createMount.js";

/**
 * Normalizes any remote module format into a uniform mount contract.
 *
 * Supported formats:
 * 1. Universal Mount Object: `{ mount, update?, unmount? }`
 * 2. Default Exported Universal Mount: `{ default: { mount, update?, unmount? } }`
 * 3. React Component (Function or Object with $$typeof / render)
 *
 * @param {any} mod
 * @returns {{ mount: Function, unmount?: Function, update?: Function, Component?: React.ComponentType<any>, raw: any } | null}
 */
export function normalizeRemoteModule(mod) {
  if (!mod) return null;

  // 1. Direct or default-exported .mount lifecycle
  const mountOwner =
    typeof mod.mount === "function"
      ? mod
      : typeof mod.default?.mount === "function"
      ? mod.default
      : null;

  if (mountOwner) {
    return {
      mount: mountOwner.mount.bind(mountOwner),
      unmount: typeof mountOwner.unmount === "function" ? mountOwner.unmount.bind(mountOwner) : undefined,
      Component: mountOwner.Component,
      raw: mod,
    };
  }

  // 2. React Component (Function or React Element/Component Object)
  const candidate = mod.default || mod;
  const isReactComponent =
    typeof candidate === "function" ||
    (typeof candidate === "object" && candidate !== null && (candidate.$$typeof || typeof candidate.render === "function"));

  if (isReactComponent) {
    const reactMount = createReactMount(candidate);
    return {
      mount: reactMount.mount,
      Component: candidate,
      raw: mod,
    };
  }

  return null;
}

/**
 * Universal Remote Mount Component.
 *
 * Mounts any federated remote micro-frontend into the host shell, whether it is:
 * - A universal lifecycle contract: `{ mount, unmount, update }` (Vue, Svelte, Solid, Angular, Vanilla).
 * - A native React component.
 *
 * Features:
 * - Dual-mode normalizer for all remote contracts.
 * - Optional Shadow DOM CSS isolation via `shadowDom` prop.
 * - React 19 safe microtask teardown.
 * - Prop updates without remounting when `update` is supported.
 * - Retriable error boundaries.
 *
 * @param {object} props
 * @param {() => Promise<any>} props.loadRemote Function returning dynamic import of the remote
 * @param {string} [props.remoteKey] Stable identifier for the remote module; changing triggers a reload
 * @param {number|string} [props.retryKey] Parent-controlled reload/retry token; changing triggers a reload
 * @param {Record<string, any>} [props.props] Props passed down to the remote
 * @param {React.ReactNode} [props.fallback] Loading fallback UI
 * @param {string} [props.className] Container class name
 * @param {string} [props.remoteName] Display name for logging/debugging
 * @param {boolean|ShadowRootInit} [props.shadowDom] Enables Shadow DOM encapsulation for CSS isolation
 * @param {(error: Error) => void} [props.onError] Callback when loading or mounting fails
 */
export function UniversalRemoteMount({
  loadRemote,
  module: rawModuleProp,
  remoteKey,
  retryKey = 0,
  props: remoteProps = {},
  fallback = null,
  errorFallback = null,
  className = "universal-remote-container",
  remoteName = "Remote Micro-Frontend",
  shadowDom = false,
  onError,
}) {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);
  const prevPropsRef = useRef(remoteProps);
  const loadRemoteRef = useRef(loadRemote);
  loadRemoteRef.current = loadRemote;
  const rawModuleRef = useRef(rawModuleProp);
  rawModuleRef.current = rawModuleProp;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const [remoteModule, setRemoteModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [internalRetry, setInternalRetry] = useState(0);

  const stableKey = remoteKey != null && remoteKey !== "" ? remoteKey : remoteName;

  // Load the remote module asynchronously (stable against inline function recreation)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const activeLoadRemote = loadRemoteRef.current;
    const activeModuleProp = rawModuleRef.current;

    let promise;

    if (typeof activeLoadRemote === "function") {
      try {
        const res = activeLoadRemote();
        if (res && typeof res.then === "function") {
          promise = res;
        } else {
          setRemoteModule(() => res);
          setLoading(false);
          return;
        }
      } catch (invokeErr) {
        const resolvedError =
          invokeErr instanceof Error ? invokeErr : new Error(String(invokeErr));
        setError(resolvedError);
        setLoading(false);
        onErrorRef.current?.(resolvedError);
        return;
      }
    } else if (activeModuleProp !== undefined && activeModuleProp !== null) {
      const isComponent =
        typeof activeModuleProp === "function" &&
        (Boolean(activeModuleProp.prototype?.isReactComponent) ||
          Boolean(activeModuleProp.$$typeof) ||
          (typeof activeModuleProp.name === "string" && /^[A-Z]/.test(activeModuleProp.name)));

      if (isComponent) {
        setRemoteModule(() => activeModuleProp);
        setLoading(false);
        return;
      }

      if (typeof activeModuleProp === "function") {
        try {
          const res = activeModuleProp();
          if (res && typeof res.then === "function") {
            promise = res;
          } else {
            setRemoteModule(() => res);
            setLoading(false);
            return;
          }
        } catch (invokeErr) {
          const resolvedError =
            invokeErr instanceof Error ? invokeErr : new Error(String(invokeErr));
          setError(resolvedError);
          setLoading(false);
          onErrorRef.current?.(resolvedError);
          return;
        }
      } else if (typeof activeModuleProp.then === "function") {
        promise = activeModuleProp;
      } else {
        setRemoteModule(() => activeModuleProp);
        setLoading(false);
        return;
      }
    } else {
      const err = new Error(
        `[UniversalRemoteMount] No module or loadRemote function provided for "${remoteName}". Please provide \`loadRemote={() => import('remote/App')}\`.`
      );
      setError(err);
      setLoading(false);
      onErrorRef.current?.(err);
      return;
    }

    promise
      .then((mod) => {
        if (!isMounted) return;
        setRemoteModule(() => mod);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        const resolvedError = err instanceof Error ? err : new Error(String(err));
        setError(resolvedError);
        setLoading(false);
        onErrorRef.current?.(resolvedError);
      });

    return () => {
      isMounted = false;
    };
  }, [stableKey, retryKey, internalRetry]);

  // Normalized lifecycle contract
  const normalized = useMemo(() => normalizeRemoteModule(remoteModule), [remoteModule]);

  // If it's a native React component and Shadow DOM is NOT requested, we can render directly in Host VDOM
  const ReactComponent = !shadowDom && normalized?.Component ? normalized.Component : null;
  const shouldMountDOM = !ReactComponent && normalized && typeof normalized.mount === "function";

  const isMountedRef = useRef(false);
  const prevRetryKeyRef = useRef(retryKey);
  const prevInternalRetryRef = useRef(internalRetry);

  // Helper to resolve the target container (either Light DOM container or ShadowRoot)
  const getTargetContainer = (container) => {
    if (!container) return null;
    if (!shadowDom) return container;

    if (container.shadowRoot) {
      return container.shadowRoot;
    }
    const shadowOptions = typeof shadowDom === "object" ? shadowDom : { mode: "open" };
    return container.attachShadow(shadowOptions);
  };

  // Lifecycle management for DOM / Shadow DOM mounts
  useEffect(() => {
    if (!shouldMountDOM || !containerRef.current) return;

    const container = containerRef.current;
    const mountTarget = getTargetContainer(container);
    if (!mountTarget) return;

    const isRetry =
      prevRetryKeyRef.current !== retryKey ||
      prevInternalRetryRef.current !== internalRetry;

    // Initial mount or retry
    if (!isMountedRef.current || isRetry) {
      if (isMountedRef.current) {
        cleanupInstance(instanceRef.current, remoteModule, mountTarget);
        instanceRef.current = null;
        isMountedRef.current = false;
      }

      try {
        const result = normalized.mount(mountTarget, remoteProps);
        instanceRef.current = result;
        isMountedRef.current = true;
        prevPropsRef.current = remoteProps;
        prevRetryKeyRef.current = retryKey;
        prevInternalRetryRef.current = internalRetry;
      } catch (mountErr) {
        const resolvedErr = mountErr instanceof Error ? mountErr : new Error(String(mountErr));
        setError(resolvedErr);
        onErrorRef.current?.(resolvedErr);
      }
      return;
    }

    // Handle prop updates without destroying the DOM tree if update() is supported
    if (!shallowEqual(prevPropsRef.current, remoteProps)) {
      if (instanceRef.current && typeof instanceRef.current.update === "function") {
        try {
          instanceRef.current.update(remoteProps);
          prevPropsRef.current = remoteProps;
        } catch (updateErr) {
          console.error(`[UniversalRemoteMount] Error updating props for ${remoteName}:`, updateErr);
        }
      } else {
        // Fallback: full unmount and re-mount if update() not provided
        cleanupInstance(instanceRef.current, remoteModule, mountTarget);
        instanceRef.current = null;
        isMountedRef.current = false;
        try {
          const result = normalized.mount(mountTarget, remoteProps);
          instanceRef.current = result;
          isMountedRef.current = true;
          prevPropsRef.current = remoteProps;
        } catch (remountErr) {
          const resolvedErr = remountErr instanceof Error ? remountErr : new Error(String(remountErr));
          setError(resolvedErr);
          onErrorRef.current?.(resolvedErr);
        }
      }
    }
  }, [shouldMountDOM, normalized, remoteProps, remoteName, remoteModule, retryKey, internalRetry, shadowDom]);

  // Cleanup on unmount
  useEffect(() => {
    const container = containerRef.current;
    return () => {
      if (isMountedRef.current && container) {
        const mountTarget = shadowDom && container.shadowRoot ? container.shadowRoot : container;
        cleanupInstance(instanceRef.current, remoteModule, mountTarget);
        instanceRef.current = null;
        isMountedRef.current = false;
      }
    };
  }, [remoteModule, shadowDom]);

  if (loading) {
    return fallback || <div className="text-gray-400 py-8 text-center">Loading {remoteName}...</div>;
  }

  if (error) {
    if (typeof errorFallback === "function") {
      return errorFallback(error, () => setInternalRetry((r) => r + 1));
    }
    if (errorFallback) {
      return errorFallback;
    }
    return (
      <div className="p-4 rounded-lg border border-red-500/30 bg-red-950/20 text-red-400 text-sm">
        <div>Failed to load {remoteName}: {error.message}</div>
        <button
          type="button"
          onClick={() => setInternalRetry((r) => r + 1)}
          className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition active:scale-95"
        >
          <span>🔄</span>
          <span>Retry</span>
        </button>
      </div>
    );
  }

  if (ReactComponent) {
    return <ReactComponent {...remoteProps} />;
  }

  return <div ref={containerRef} className={className} data-remote-name={remoteName} />;
}

/**
 * Disposes of a mounted universal remote instance safely.
 */
function cleanupInstance(instance, remoteModule, container) {
  try {
    if (typeof instance === "function") {
      instance();
    } else if (instance && typeof instance.unmount === "function") {
      instance.unmount.call(instance, container);
    } else if (typeof remoteModule?.unmount === "function") {
      remoteModule.unmount.call(remoteModule, container);
    } else if (typeof remoteModule?.default?.unmount === "function") {
      remoteModule.default.unmount.call(remoteModule.default, container);
    }
  } catch (err) {
    console.error("[UniversalRemoteMount] Error during unmount cleanup:", err);
  }
}

/**
 * Shallow equality comparison for props.
 */
function shallowEqual(objA, objB) {
  if (Object.is(objA, objB)) return true;
  if (
    typeof objA !== "object" ||
    objA === null ||
    typeof objB !== "object" ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (
      !Object.prototype.hasOwnProperty.call(objB, key) ||
      !Object.is(objA[key], objB[key])
    ) {
      return false;
    }
  }

  return true;
}
