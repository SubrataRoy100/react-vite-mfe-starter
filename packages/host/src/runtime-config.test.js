import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("Host Remote-URL Runtime Configuration Override", () => {
  const remoteName = "demoService";
  const fallbackUrl = "http://localhost:5001/remoteEntry.js";

  /**
   * Evaluates the federation external resolution expression exactly as built in host/vite.config.js
   */
  function resolveRemoteUrl(name, fallback) {
    return Promise.resolve(
      (typeof window !== "undefined" &&
        window.__MFE_RUNTIME_CONFIG__ &&
        window.__MFE_RUNTIME_CONFIG__[name]) ||
        fallback
    );
  }

  beforeEach(() => {
    delete window.__MFE_RUNTIME_CONFIG__;
  });

  afterEach(() => {
    delete window.__MFE_RUNTIME_CONFIG__;
  });

  it("uses the fallback URL when window.__MFE_RUNTIME_CONFIG__ is absent", async () => {
    const resolved = await resolveRemoteUrl(remoteName, fallbackUrl);
    expect(resolved).toBe(fallbackUrl);
  });

  it("uses the fallback URL when window.__MFE_RUNTIME_CONFIG__ is empty", async () => {
    window.__MFE_RUNTIME_CONFIG__ = {};
    const resolved = await resolveRemoteUrl(remoteName, fallbackUrl);
    expect(resolved).toBe(fallbackUrl);
  });

  it("uses the runtime override URL when present in window.__MFE_RUNTIME_CONFIG__", async () => {
    const overrideUrl = "https://cdn.production.com/remotes/demo/remoteEntry.js";
    window.__MFE_RUNTIME_CONFIG__ = {
      [remoteName]: overrideUrl,
    };

    const resolved = await resolveRemoteUrl(remoteName, fallbackUrl);
    expect(resolved).toBe(overrideUrl);
  });
});
