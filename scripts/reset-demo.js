import {
  existsSync,
  cpSync,
  rmSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";
import { generateRemotesDts } from "./generate-remotes-dts.js";

const rootDir = process.cwd();
const packagesDir = resolve(rootDir, "packages");
const backupDir = resolve(rootDir, ".demo-backup");
const manifestPath = resolve(rootDir, "remotes.manifest.json");
const planServicesPath = resolve(rootDir, "PlanServices.md");

const noBackup = process.argv.includes("--no-backup");

console.log("🧹 Resetting micro-frontend workspace to clean starter mode...\n");

// 1. Identify all remote services to remove (preserve 'host' and 'shared')
const protectedPackages = new Set(["host", "shared"]);
const knownDefaultRemotes = ["marketingMfe", "authMfe", "demoService"];

let manifest = {};
if (existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  } catch (err) {
    console.warn("⚠️  Could not parse remotes.manifest.json:", err.message);
  }
}

// Any service in manifest + any known default remote directory
const servicesToRemove = new Set([
  ...Object.keys(manifest),
  ...knownDefaultRemotes,
]);

// Find which of these actually exist in packages/
const existingServices = [];
if (existsSync(packagesDir)) {
  const dirs = readdirSync(packagesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !protectedPackages.has(d.name))
    .map((d) => d.name);

  for (const dir of dirs) {
    if (servicesToRemove.has(dir)) {
      existingServices.push(dir);
    }
  }
}

// Helper to remove directory safely on all platforms (handles Windows file locks)
function safeRmDir(dirPath) {
  if (!existsSync(dirPath)) return;
  try {
    rmSync(dirPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    if (process.platform === "win32") {
      try {
        execSync(`rmdir /s /q "${dirPath}"`, { stdio: "ignore" });
      } catch {
        // Ignored
      }
    }
  }
}

// 2. Backup if requested
if (!noBackup) {
  console.log("📦 Creating backup of demo setup in .demo-backup/...");
  mkdirSync(backupDir, { recursive: true });

  // Backup remote packages
  const backupPackagesDir = join(backupDir, "packages");
  mkdirSync(backupPackagesDir, { recursive: true });

  for (const svc of existingServices) {
    const srcDir = join(packagesDir, svc);
    const destDir = join(backupPackagesDir, svc);
    safeRmDir(destDir);
    cpSync(srcDir, destDir, { recursive: true });
    console.log(`   ✓ Backed up packages/${svc}`);
  }

  // Backup remotes.manifest.json
  if (existsSync(manifestPath)) {
    cpSync(manifestPath, resolve(backupDir, "remotes.manifest.json"));
    console.log("   ✓ Backed up remotes.manifest.json");
  }

  // Backup PlanServices.md
  if (existsSync(planServicesPath)) {
    cpSync(planServicesPath, resolve(backupDir, "PlanServices.md"));
    console.log("   ✓ Backed up PlanServices.md");
  }

  console.log("   ✓ Backup completed at: .demo-backup/\n");
}

// 3. Remove existing demo services
if (existingServices.length > 0) {
  console.log("🗑️  Removing demo micro-frontend packages...");
  for (const svc of existingServices) {
    const dir = join(packagesDir, svc);
    safeRmDir(dir);
    console.log(`   ✓ packages/${svc} removed.`);
  }
  console.log("");
} else {
  console.log("ℹ️  No demo packages found in packages/ to remove.\n");
}

// 4. Remove PlanServices.md
if (existsSync(planServicesPath)) {
  try {
    rmSync(planServicesPath, { force: true });
    console.log("🗑️  PlanServices.md removed.\n");
  } catch (err) {
    console.warn("⚠️  Could not remove PlanServices.md:", err.message);
  }
}

// 5. Reset remotes.manifest.json to clean empty state
try {
  writeFileSync(manifestPath, "{}\n", "utf-8");
  console.log("📝 Reset remotes.manifest.json to clean empty object ({}).\n");
} catch (err) {
  console.warn("⚠️  Could not reset remotes.manifest.json:", err.message);
}

// 6. Regenerate host types and dynamic route registry
console.log("⚙️  Regenerating host route registry and ambient TypeScript declarations...");
generateRemotesDts();
console.log("   ✓ remotesRegistry.jsx refreshed to clean empty routes.");
console.log("   ✓ remotes.d.ts refreshed.\n");

console.log("✨ Workspace reset complete!");
console.log("---------------------------------------------------------------");
console.log("• All demo services, PlanServices.md, and manifest entries removed.");
console.log("• Your host shell retains zero-touch dynamic routing.");
console.log("• To scaffold your first remote: run 'pnpm mfe:create <name>'");
console.log("• To restore the demo setup anytime: run 'pnpm restore:demo' (or 'pnpm restore/demo')");
console.log("---------------------------------------------------------------\n");
