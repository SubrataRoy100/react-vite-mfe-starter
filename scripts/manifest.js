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

export function resolvePackageName(remoteName, manifest, rootDir = process.cwd()) {
  const cfg = manifest?.[remoteName];
  const dirName =
    cfg?.dir ||
    cfg?.package ||
    remoteName.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

  const candidates = [
    resolve(rootDir, "apps", dirName, "package.json"),
    resolve(rootDir, "apps", remoteName, "package.json"),
    resolve(rootDir, "packages", remoteName, "package.json"),
  ];

  for (const cand of candidates) {
    if (existsSync(cand)) {
      try {
        const pkg = JSON.parse(readFileSync(cand, "utf-8"));
        if (pkg.name) return pkg.name;
      } catch {
        // Ignored
      }
    }
  }

  return cfg?.package || cfg?.dir || remoteName;
}

export function getBuildFilterArgs(manifest) {
  const remotes = getRemoteNames(manifest);
  if (remotes.length === 0) return [];
  return remotes.flatMap((name) => [
    "--filter",
    resolvePackageName(name, manifest),
  ]);
}

const COLOR_PALETTE = ["blue", "magenta", "yellow", "green", "red", "cyan"];

export function getDevCommands(manifest) {
  const remotes = getRemoteNames(manifest);
  const commands = [];

  remotes.forEach((remote, index) => {
    const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
    const pkgName = resolvePackageName(remote, manifest);

    // Single dev command per remote using Vite dev server and live Module Federation HMR
    commands.push({
      command: `pnpm --filter ${pkgName} dev`,
      name: remote,
      prefixColor: color,
    });
  });

  return commands;
}
