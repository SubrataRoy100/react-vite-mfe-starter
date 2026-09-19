import { existsSync, cpSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { generateRemotesDts } from "./generate-remotes-dts.js";

const rootDir = process.cwd();
const backupDir = resolve(rootDir, ".demo-backup");
const packagesDir = resolve(rootDir, "packages");
const manifestPath = resolve(rootDir, "remotes.manifest.json");

console.log("🔄 Restoring demo service setup from .demo-backup/...\n");

if (!existsSync(backupDir)) {
  console.error("❌ Error: No backup found at .demo-backup/.");
  console.error("   Cannot restore demo services automatically.");
  process.exit(1);
}

function toKebabCase(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

// 1. Restore packages
let restoredPackagesCount = 0;
const appsDir = resolve(rootDir, "apps");

// Prioritize .demo-backup/apps/ over legacy .demo-backup/packages/
const packagesToRestore = [];
const backupAppsDir = join(backupDir, "apps");
const backupPackagesDir = join(backupDir, "packages");

if (existsSync(backupAppsDir)) {
  const dirs = readdirSync(backupAppsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ name: d.name, path: join(backupAppsDir, d.name), originalParent: "apps" }));
  packagesToRestore.push(...dirs);
} else if (existsSync(backupPackagesDir)) {
  const dirs = readdirSync(backupPackagesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ name: d.name, path: join(backupPackagesDir, d.name), originalParent: "packages" }));
  packagesToRestore.push(...dirs);
}

// Also check root of backupDir for directories (legacy backwards compatibility)
if (packagesToRestore.length === 0) {
  const rootBackupDirs = readdirSync(backupDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "packages" && d.name !== "apps")
    .map((d) => ({ name: d.name, path: join(backupDir, d.name), originalParent: "apps" }));
  packagesToRestore.push(...rootBackupDirs);
}

for (const pkg of packagesToRestore) {
  // If apps/ directory exists in root and pkg is not shared, restore into apps/<kebab-case>
  let targetParent = pkg.originalParent;
  let targetName = pkg.name;
  if (existsSync(appsDir) && pkg.name !== "shared") {
    targetParent = "apps";
    targetName = toKebabCase(pkg.name);
  }
  const targetDir = resolve(rootDir, targetParent, targetName);
  console.log(`📦 Restoring ${targetParent}/${targetName}...`);
  cpSync(pkg.path, targetDir, { recursive: true });
  console.log(`   ✓ ${targetParent}/${targetName} restored.`);
  restoredPackagesCount++;
}


// 3. Restore remotes.manifest.json
const backupManifest = resolve(backupDir, "remotes.manifest.json");
if (existsSync(backupManifest)) {
  try {
    const originalManifest = JSON.parse(readFileSync(backupManifest, "utf-8"));
    const currentManifest = existsSync(manifestPath)
      ? JSON.parse(readFileSync(manifestPath, "utf-8"))
      : {};

    const mergedManifest = {
      ...currentManifest,
      ...originalManifest,
    };

    writeFileSync(manifestPath, JSON.stringify(mergedManifest, null, 2) + "\n", "utf-8");
    console.log("📝 Restored remotes.manifest.json with demo services configuration.");
  } catch (err) {
    console.warn("⚠️  Could not restore remotes.manifest.json:", err.message);
  }
}

// 4. Regenerate host types and dynamic registry
console.log("\n⚙️  Regenerating host route registry and ambient TypeScript declarations...");
generateRemotesDts();
console.log("   ✓ remotesRegistry.jsx updated with restored remotes.");
console.log("   ✓ remotes.d.ts updated.");

console.log("\n🎉 Demo service setup successfully restored!");
console.log("---------------------------------------------------------------");
console.log(`• Restored ${restoredPackagesCount} micro-frontend package(s).`);
console.log("• Run 'pnpm dev' or 'pnpm build' to launch the demo environment.");
console.log("---------------------------------------------------------------\n");
