import { execSync } from "node:child_process";
import concurrently from "concurrently";
import {
  loadManifest,
  getRemoteNames,
  getTargetedManifest,
  getBuildFilterArgs,
  getDevCommands,
} from "./manifest.js";
import { checkAndFreePorts } from "./port-guard.js";
import { generateRemotesDts } from "./generate-remotes-dts.js";

const action = process.argv[2] || "dev";
const manifest = loadManifest();

// Parse optional targeted remote flag: --only <name> or --target <name>
const targetFlagIndex = process.argv.findIndex(
  (arg) => arg === "--only" || arg === "--target"
);
const targetedRemote =
  targetFlagIndex !== -1 ? process.argv[targetFlagIndex + 1] : null;

let activeManifest = manifest;
if (targetedRemote) {
  try {
    activeManifest = getTargetedManifest(manifest, targetedRemote);
    console.log(`🎯 Targeted DX Mode: Active remote is "${targetedRemote}".`);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

const remotes = getRemoteNames(manifest);
const activeRemotes = getRemoteNames(activeManifest);

switch (action) {
  case "list": {
    console.log(`\nConfigured Remote Micro-Frontends (${remotes.length}):`);
    for (const [name, cfg] of Object.entries(manifest)) {
      console.log(`  - ${name}: port ${cfg.port}, entry: ${cfg.entry} (env: ${cfg.envVar})`);
    }
    console.log("");
    break;
  }

  case "build-remotes":
  case "build:remotes": {
    if (activeRemotes.length === 0) {
      console.log("No remotes configured in remotes.manifest.json. Skipping.");
      process.exit(0);
    }
    generateRemotesDts();
    const filterArgs = getBuildFilterArgs(activeManifest).join(" ");
    console.log(`Building remotes: ${activeRemotes.join(", ")}...`);
    execSync(`pnpm exec turbo run build ${filterArgs}`, { stdio: "inherit", shell: true });
    break;
  }

  case "build": {
    generateRemotesDts();
    console.log("Running production monorepo build with Turborepo...");
    execSync("pnpm exec turbo run build", { stdio: "inherit", shell: true });
    break;
  }

  case "clean-ports":
  case "clean:ports": {
    const ports = [5000, ...Object.values(manifest).map((c) => c.port).filter(Boolean)];
    console.log(`[orchestrate] Checking and freeing ports: ${ports.join(", ")}...`);
    checkAndFreePorts(ports, true);
    console.log(`[orchestrate] All ports free.`);
    break;
  }

  case "dev": {
    // 1. Automatically keep types and registry synchronized
    generateRemotesDts();

    // 2. Run safe pre-flight port guard
    const portsToCheck = [
      5000,
      ...Object.values(activeManifest).map((c) => c.port).filter(Boolean),
    ];
    console.log(`[orchestrate] Running pre-flight port guard on: ${portsToCheck.join(", ")}...`);
    checkAndFreePorts(portsToCheck, true);

    // 3. Launch live Vite dev servers with true HMR across all packages
    const devCommands = [
      ...getDevCommands(activeManifest),
      {
        command: "pnpm --filter host dev",
        name: "host",
        prefixColor: "cyan",
      },
    ];

    console.log(`Starting development orchestration with live HMR (${devCommands.length} processes)...`);
    const { result } = concurrently(devCommands, {
      prefix: "name",
      killOthers: ["failure"],
      restartTries: 0,
    });

    result.catch((err) => {
      if (err && !Array.isArray(err)) {
        console.error("Concurrently orchestration failed:", err);
      }
    });
    break;
  }

  default:
    console.error(`Unknown action: ${action}. Available: dev, build, build-remotes, list`);
    process.exit(1);
}
