import React, { useEffect, useRef, useState, useMemo } from "react";

/**
 * Universal Remote Mount Component.
 *
 * Mounts any federated remote micro-frontend into the host shell, whether it is:
 * - A universal lifecycle contract: `{ mount, unmount, update }` (Vue, Svelte, Solid, Angular, Vanilla).
 * - A native React component.
 *
 * @param {object} props
 * @param {() => Promise<any>} props.loadRemote Function returning the dynamic import of the remote
 * @param {string} [props.remoteKey] Stable identifier for the remote module; changing triggers a reload
 * @param {number|string} [props.retryKey] Parent-controlled reload/retry token; changing triggers a reload
 * @param {Record<string, any>} [props.props] Props passed down to the remote
 * @param {React.ReactNode} [props.fallback] Loading fallback UI
 * @param {string} [props.className] Container class name
 * @param {string} [props.remoteName] Display name for logging/debugging
 * @param {(error: Error) => void} [props.onError] Callback when loading or mounting fails
 */
export function UniversalRemoteMount({
  loadRemote,
  remoteKey,
  retryKey = 0,
  props: remoteProps = {},
  fallback = null,
  className = "universal-remote-container",
  remoteName = "Remote Micro-Frontend",
  onError,
}) {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);
  const prevPropsRef = useRef(remoteProps);
  const loadRemoteRef = useRef(loadRemote);
  loadRemoteRef.current = loadRemote;
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

    loadRemoteRef.current()
      .then((mod) => {
        if (!isMounted) return;
        setRemoteModule(mod);
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

  // Determine if remote module provides a Universal Mount contract or a React Component
  const mountFn = useMemo(() => {
    const mountOwner =
      typeof remoteModule?.mount === "function"
        ? remoteModule
        : typeof remoteModule?.default?.mount === "function"
        ? remoteModule.default
        : null;
    return mountOwner ? mountOwner.mount.bind(mountOwner) : null;
  }, [remoteModule]);

  const ReactComponent =
    !mountFn && remoteModule
      ? typeof remoteModule.default === "function"
        ? remoteModule.default
        : typeof remoteModule === "function"
        ? remoteModule
        : null
      : null;

  const isMountedRef = useRef(false);
  const prevRetryKeyRef = useRef(retryKey);
  const prevInternalRetryRef = useRef(internalRetry);

  // Lifecycle management for Universal DOM mounts
  useEffect(() => {
    if (!mountFn || !containerRef.current) return;

    const container = containerRef.current;
    const isRetry =
      prevRetryKeyRef.current !== retryKey ||
      prevInternalRetryRef.current !== internalRetry;

    // Initial mount or retry
    if (!isMountedRef.current || isRetry) {
      if (isMountedRef.current) {
        cleanupInstance(instanceRef.current, remoteModule, container);
        instanceRef.current = null;
        isMountedRef.current = false;
      }

      try {
        const result = mountFn(container, remoteProps);
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
        cleanupInstance(instanceRef.current, remoteModule, container);
        instanceRef.current = null;
        isMountedRef.current = false;
        try {
          const result = mountFn(container, remoteProps);
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
  }, [mountFn, remoteProps, remoteName, remoteModule, retryKey, internalRetry]);

  // Cleanup on unmount
  useEffect(() => {
    const container = containerRef.current;
    return () => {
      if (isMountedRef.current) {
        cleanupInstance(instanceRef.current, remoteModule, container);
        instanceRef.current = null;
        isMountedRef.current = false;
      }
    };
  }, [remoteModule]);

  if (loading) {
    return fallback || <div className="text-gray-400 py-8 text-center">Loading {remoteName}...</div>;
  }

  if (error) {
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
