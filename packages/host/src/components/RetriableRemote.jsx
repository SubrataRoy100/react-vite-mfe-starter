import React, { useState, useEffect, useRef } from "react";
import RemoteErrorBoundary from "./RemoteErrorBoundary";
import LoadingFallback from "./LoadingFallback";

/**
 * Inner loader component that manages dynamic import loading lifecycle.
 * Throws on error so the enclosing RemoteErrorBoundary catches and isolates failures.
 */
function RemoteLoader({ loader, retryKey, fallback, fallbackMessage, ...restProps }) {
  const [Component, setComponent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  useEffect(() => {
    let isMounted = true;
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true);
    setError(null);

    loaderRef.current()
      .then((mod) => {
        if (!isMounted) return;
        setComponent(() => (mod && mod.default ? mod.default : mod));
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        const resolvedErr = err instanceof Error ? err : new Error(String(err));
        setError(resolvedErr);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [retryKey]);

  if (error) {
    throw error;
  }

  if (loading || !Component) {
    return fallback || <LoadingFallback message={fallbackMessage} />;
  }

  return <Component {...restProps} />;
}

/**
 * Retriable wrapper for federated remote micro-frontends.
 * Prevents React.lazy's rejected promise caching by re-invoking the loader on error boundary reset.
 *
 * @param {object} props
 * @param {() => Promise<{ default: React.ComponentType<any> }>} props.loader Dynamic import function for the remote
 * @param {string} [props.remoteName] Display name of the remote service
 * @param {string} [props.serviceName] Exact manifest service key for dev-server CLI hints
 * @param {string} [props.fallbackMessage] Message for default LoadingFallback
 * @param {React.ReactNode} [props.fallback] Custom loading fallback element
 */
export default function RetriableRemote({
  loader,
  remoteName = "Remote Module",
  serviceName,
  fallbackMessage = `Loading ${remoteName}...`,
  fallback,
  ...restProps
}) {
  const [retryKey, setRetryKey] = useState(0);

  return (
    <RemoteErrorBoundary
      remoteName={remoteName}
      serviceName={serviceName}
      onReset={() => setRetryKey((k) => k + 1)}
    >
      <RemoteLoader
        loader={loader}
        retryKey={retryKey}
        fallback={fallback}
        fallbackMessage={fallbackMessage}
        {...restProps}
      />
    </RemoteErrorBoundary>
  );
}
