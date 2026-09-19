import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export function loadManifest(manifestPath = resolve(process.cwd(), "remotes.manifest.json")) {
  if (!existsSync(manifestPath)) {
    throw new Error(`remotes.manifest.json not found at: ${manifestPath}`);
  }
  const content = readFileSync(manifestPath, "utf-8");
  return JSON.parse(content);
}

export function getRemoteNames(manifest) {
  return Object.keys(manifest || {});
}

export function getTargetedManifest(manifest, targetName) {
  if (!targetName) return manifest;
  if (!manifest || !manifest[targetName]) {
    const available = Object.keys(manifest || {}).join(", ") || "none";
    throw new Error(
      `Remote "${targetName}" not found in remotes.manifest.json. Available remotes: ${available}`
    );
  }
  return { [targetName]: manifest[targetName] };
}

export function getBuildFilterArgs(manifest) {
  const remotes = getRemoteNames(manifest);
  if (remotes.length === 0) return [];
  return remotes.flatMap((name) => ["--filter", name]);
}

const COLOR_PALETTE = ["blue", "magenta", "yellow", "green", "red", "cyan"];

export function getDevCommands(manifest) {
  const remotes = getRemoteNames(manifest);
  const commands = [];

  remotes.forEach((remote, index) => {
    const color = COLOR_PALETTE[index % COLOR_PALETTE.length];

    // Single dev command per remote using Vite dev server and live Module Federation HMR
    commands.push({
      command: `pnpm --filter ${remote} dev`,
      name: remote,
      prefixColor: color,
    });
  });

  return commands;
}
