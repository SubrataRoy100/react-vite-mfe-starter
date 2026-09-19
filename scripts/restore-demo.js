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

// 1. Restore packages
let restoredPackagesCount = 0;
const backupPackagesDir = join(backupDir, "packages");

const packagesToRestore = [];
if (existsSync(backupPackagesDir)) {
  const dirs = readdirSync(backupPackagesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ name: d.name, path: join(backupPackagesDir, d.name) }));
  packagesToRestore.push(...dirs);
}

// Also check root of backupDir for directories (legacy backwards compatibility)
// only if no packages were found in .demo-backup/packages/
if (packagesToRestore.length === 0) {
  const rootBackupDirs = readdirSync(backupDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "packages")
    .map((d) => ({ name: d.name, path: join(backupDir, d.name) }));
  packagesToRestore.push(...rootBackupDirs);
}

for (const pkg of packagesToRestore) {
  const targetDir = join(packagesDir, pkg.name);
  console.log(`📦 Restoring packages/${pkg.name}...`);
  cpSync(pkg.path, targetDir, { recursive: true });
  console.log(`   ✓ packages/${pkg.name} restored.`);
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
