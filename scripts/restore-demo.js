import { existsSync, cpSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const backupDir = resolve(rootDir, ".demo-backup");
const demoServiceDir = resolve(rootDir, "packages", "demoService");
const manifestPath = resolve(rootDir, "remotes.manifest.json");
const hostAppPath = resolve(rootDir, "packages", "host", "src", "App.jsx");
const hostLandingPath = resolve(rootDir, "packages", "host", "src", "pages", "LandingPage.jsx");

console.log("🔄 Restoring demo service setup from .demo-backup/...\n");

if (!existsSync(backupDir)) {
  console.error("❌ Error: No backup found at .demo-backup/.");
  console.error("   Cannot restore demo service automatically.");
  process.exit(1);
}

const backupDemoService = resolve(backupDir, "demoService");
if (existsSync(backupDemoService)) {
  console.log("📦 Restoring packages/demoService...");
  cpSync(backupDemoService, demoServiceDir, { recursive: true });
  console.log("   ✓ packages/demoService restored.");
}

const backupApp = resolve(backupDir, "App.jsx");
if (existsSync(backupApp)) {
  cpSync(backupApp, hostAppPath);
  console.log("   ✓ packages/host/src/App.jsx restored.");
}

const backupLanding = resolve(backupDir, "LandingPage.jsx");
if (existsSync(backupLanding)) {
  cpSync(backupLanding, hostLandingPath);
  console.log("   ✓ packages/host/src/pages/LandingPage.jsx restored.");
}

const backupManifest = resolve(backupDir, "remotes.manifest.json");
if (existsSync(backupManifest)) {
  try {
    const originalManifest = JSON.parse(readFileSync(backupManifest, "utf-8"));
    const currentManifest = existsSync(manifestPath)
      ? JSON.parse(readFileSync(manifestPath, "utf-8"))
      : {};

    // Restore demoService into the current manifest without losing any other remotes
    currentManifest.demoService = originalManifest.demoService || {
      port: 5001,
      path: "/demo",
      entry: "/assets/remoteEntry.js",
      envVar: "VITE_DEMO_SERVICE_URL",
    };

    writeFileSync(manifestPath, JSON.stringify(currentManifest, null, 2) + "\n", "utf-8");
    console.log("   ✓ remotes.manifest.json restored with demoService.");
  } catch (err) {
    console.warn("⚠️  Could not restore remotes.manifest.json:", err.message);
  }
}

console.log("\n🎉 Demo service setup successfully restored!");
console.log("Run 'pnpm dev' or 'pnpm build' to launch the demo environment.\n");
