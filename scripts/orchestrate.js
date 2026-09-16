import { execSync } from "node:child_process";
import concurrently from "concurrently";
import {
  loadManifest,
  getRemoteNames,
  getTargetedManifest,
  getBuildFilterArgs,
  getDevCommands,
} from "./manifest.js";

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
    const filterArgs = getBuildFilterArgs(activeManifest).join(" ");
    console.log(`Building remotes: ${activeRemotes.join(", ")}...`);
    execSync(`pnpm ${filterArgs} build`, { stdio: "inherit", shell: true });
    break;
  }

  case "build": {
    if (remotes.length > 0) {
      const filterArgs = getBuildFilterArgs(manifest).join(" ");
      console.log(`Building remotes: ${remotes.join(", ")}...`);
      execSync(`pnpm ${filterArgs} build`, { stdio: "inherit", shell: true });
    }
    console.log("Building host application shell...");
    execSync("pnpm --filter host build", { stdio: "inherit", shell: true });
    break;
  }

  case "dev": {
    if (activeRemotes.length > 0) {
      const filterArgs = getBuildFilterArgs(activeManifest).join(" ");
      console.log(`Performing initial build for remotes: ${activeRemotes.join(", ")}...`);
      execSync(`pnpm ${filterArgs} build`, { stdio: "inherit", shell: true });
    }

    const devCommands = [
      ...getDevCommands(activeManifest),
      {
        command: "pnpm --filter host dev",
        name: "host",
        prefixColor: "cyan",
      },
    ];

    console.log(`Starting development orchestration (${devCommands.length} processes)...`);
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
