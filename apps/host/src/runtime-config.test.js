import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveRemoteUrl } from "./utils/resolveRemoteUrl.js";
import runtimeRemoteOverridePlugin from "./plugins/runtimeRemoteOverride.js";

describe("Host Remote-URL Runtime Configuration Override", () => {
  const remoteName = "marketingMfe";
  const fallbackUrl = "http://localhost:5002/remoteEntry.js";

  beforeEach(() => {
    delete window.__MFE_RUNTIME_CONFIG__;
  });

  afterEach(() => {
    delete window.__MFE_RUNTIME_CONFIG__;
  });

  it("uses the fallback URL when window.__MFE_RUNTIME_CONFIG__ is absent", () => {
    const resolved = resolveRemoteUrl(remoteName, fallbackUrl);
    expect(resolved).toBe(fallbackUrl);
  });

  it("uses the fallback URL when window.__MFE_RUNTIME_CONFIG__ is empty", () => {
    window.__MFE_RUNTIME_CONFIG__ = {};
    const resolved = resolveRemoteUrl(remoteName, fallbackUrl);
    expect(resolved).toBe(fallbackUrl);
  });

  it("uses the runtime override URL when present in window.__MFE_RUNTIME_CONFIG__", () => {
    const overrideUrl = "https://cdn.production.com/remotes/marketing/remoteEntry.js";
    window.__MFE_RUNTIME_CONFIG__ = {
      [remoteName]: overrideUrl,
    };

    const resolved = resolveRemoteUrl(remoteName, fallbackUrl);
    expect(resolved).toBe(overrideUrl);
  });

  it("updates remote entry in runtime plugin beforeRegisterRemote hook", () => {
    const plugin = runtimeRemoteOverridePlugin();
    window.__MFE_RUNTIME_CONFIG__ = {
      marketingMfe: "https://edge.example.com/marketing/remoteEntry.js",
    };

    const args = {
      remote: {
        name: "marketingMfe",
        entry: "http://localhost:5002/remoteEntry.js",
      },
    };

    plugin.beforeRegisterRemote(args);
    expect(args.remote.entry).toBe("https://edge.example.com/marketing/remoteEntry.js");
  });

  it("updates remote entry in runtime plugin beforeRequest hook", () => {
    const plugin = runtimeRemoteOverridePlugin();
    window.__MFE_RUNTIME_CONFIG__ = {
      authMfe: "https://edge.example.com/auth/remoteEntry.js",
    };

    const args = {
      id: "authMfe/App",
      origin: {
        options: {
          remotes: [
            {
              name: "authMfe",
              entry: "http://localhost:5003/remoteEntry.js",
            },
          ],
        },
      },
    };

    plugin.beforeRequest(args);
    expect(args.origin.options.remotes[0].entry).toBe(
      "https://edge.example.com/auth/remoteEntry.js"
    );
  });
});
