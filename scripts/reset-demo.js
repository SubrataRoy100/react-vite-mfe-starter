import { existsSync, cpSync, rmSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { CLEAN_HOST_APP, CLEAN_HOST_LANDING_PAGE } from "./clean-templates.js";

const rootDir = process.cwd();
const demoServiceDir = resolve(rootDir, "packages", "demoService");
const backupDir = resolve(rootDir, ".demo-backup");
const manifestPath = resolve(rootDir, "remotes.manifest.json");
const hostAppPath = resolve(rootDir, "packages", "host", "src", "App.jsx");
const hostLandingPath = resolve(rootDir, "packages", "host", "src", "pages", "LandingPage.jsx");

const noBackup = process.argv.includes("--no-backup");

console.log("🧹 Resetting micro-frontend workspace to clean starter mode...\n");

if (!existsSync(demoServiceDir)) {
  console.log("ℹ️  demoService is not present in packages/. Checking manifest and templates...");
} else {
  if (!noBackup) {
    console.log("📦 Creating backup of demo setup in .demo-backup/...");
    mkdirSync(backupDir, { recursive: true });

    // Backup demoService
    cpSync(demoServiceDir, resolve(backupDir, "demoService"), { recursive: true });

    // Backup host files
    if (existsSync(hostAppPath)) {
      cpSync(hostAppPath, resolve(backupDir, "App.jsx"));
    }
    if (existsSync(hostLandingPath)) {
      cpSync(hostLandingPath, resolve(backupDir, "LandingPage.jsx"));
    }
    if (existsSync(manifestPath)) {
      cpSync(manifestPath, resolve(backupDir, "remotes.manifest.json"));
    }
    console.log("   ✓ Backup completed at: .demo-backup/\n");
  }

  console.log("🗑️  Removing packages/demoService...");
  try {
    rmSync(demoServiceDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch (err) {
    if (process.platform === "win32") {
      try {
        const { execSync } = await import("node:child_process");
        execSync(`rmdir /s /q "${demoServiceDir}"`, { stdio: "ignore" });
      } catch {
        // Ignored
      }
    } else {
      throw err;
    }
  }
  console.log("   ✓ packages/demoService removed.\n");
}

// Update remotes.manifest.json
if (existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    if (manifest.demoService) {
      delete manifest.demoService;
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
      console.log("📝 Updated remotes.manifest.json (removed demoService).");
    }
  } catch (err) {
    console.warn("⚠️  Could not update remotes.manifest.json:", err.message);
  }
}

// Replace host files with clean starter templates
console.log("🎨 Applying clean starter templates to Host Shell...");
writeFileSync(hostAppPath, CLEAN_HOST_APP, "utf-8");
writeFileSync(hostLandingPath, CLEAN_HOST_LANDING_PAGE, "utf-8");
console.log("   ✓ packages/host/src/App.jsx updated.");
console.log("   ✓ packages/host/src/pages/LandingPage.jsx updated.\n");

console.log("✨ Workspace reset complete!");
console.log("---------------------------------------------------------------");
console.log("• Your host shell is now a pristine starter ready for your remotes.");
console.log("• To view your clean host: run 'pnpm dev'");
console.log("• To restore the demo setup anytime: run 'pnpm restore:demo'");
console.log("---------------------------------------------------------------\n");
