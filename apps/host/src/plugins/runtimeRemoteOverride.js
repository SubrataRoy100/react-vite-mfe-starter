import { resolveRemoteUrl } from "../utils/resolveRemoteUrl.js";

/**
 * Module Federation 2.0 Runtime Plugin that dynamically rewrites remote entry URLs
 * based on window.__MFE_RUNTIME_CONFIG__ overrides at request time.
 */
export default function runtimeRemoteOverridePlugin() {
  return {
    name: "runtime-remote-override-plugin",
    beforeRegisterRemote(args) {
      if (args && args.remote && args.remote.name) {
        const resolved = resolveRemoteUrl(args.remote.name, args.remote.entry);
        if (resolved !== args.remote.entry) {
          args.remote.entry = resolved;
        }
      }
      return args;
    },
    beforeRequest(args) {
      if (args && args.id && args.origin?.options?.remotes) {
        const remoteName = args.id.split("/")[0];
        const remoteEntry = args.origin.options.remotes.find(
          (r) => r.name === remoteName
        );
        if (remoteEntry) {
          const resolved = resolveRemoteUrl(remoteName, remoteEntry.entry);
          if (resolved !== remoteEntry.entry) {
            remoteEntry.entry = resolved;
          }
        }
      }
      return args;
    },
  };
}
