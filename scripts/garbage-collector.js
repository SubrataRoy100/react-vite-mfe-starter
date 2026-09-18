import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  mkdirSync,
  rmSync,
  cpSync,
} from "node:fs";
import { resolve, join, relative, extname } from "node:path";
import { execSync } from "node:child_process";
import { generateRemotesDts } from "./generate-remotes-dts.js";

const DEFAULT_ROOT = process.cwd();
const PROTECTED_PACKAGES = new Set(["host", "shared"]);
const SOURCE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
]);

// ============================================================================
// 1. Manifest & Package Drift Detector
// ============================================================================
export function auditManifestDrift({
  rootDir = DEFAULT_ROOT,
  manifest = null,
} = {}) {
  const issues = [];
  const packagesDir = resolve(rootDir, "packages");
  const manifestPath = resolve(rootDir, "remotes.manifest.json");

  let parsedManifest = manifest;
  if (!parsedManifest && existsSync(manifestPath)) {
    try {
      parsedManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    } catch {
      parsedManifest = {};
    }
  }
  parsedManifest = parsedManifest || {};

  const manifestKeys = new Set(Object.keys(parsedManifest));

  // Find packages on disk
  const existingPackages = new Set();
  if (existsSync(packagesDir)) {
    const entries = readdirSync(packagesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        existingPackages.add(entry.name);
      }
    }
  }

  // 1a. Missing manifest entry: Folder in packages/* that is not host, shared, or in manifest
  for (const pkgName of existingPackages) {
    if (!PROTECTED_PACKAGES.has(pkgName) && !manifestKeys.has(pkgName)) {
      issues.push({
        category: "manifest_drift",
        type: "unregistered_package",
        name: pkgName,
        path: join(packagesDir, pkgName),
        description: `Package 'packages/${pkgName}' exists on disk but is not registered in remotes.manifest.json.`,
      });
    }
  }

  // 1b. Ghost package in manifest: Key in manifest whose directory does not exist
  for (const remoteName of manifestKeys) {
    if (!existingPackages.has(remoteName)) {
      issues.push({
        category: "manifest_drift",
        type: "missing_package_dir",
        name: remoteName,
        path: manifestPath,
        description: `Remote '${remoteName}' is defined in remotes.manifest.json, but 'packages/${remoteName}' does not exist on disk.`,
      });
    }
  }

  return issues;
}

// ============================================================================
// 2. Stale Service References Detector
// ============================================================================
export function auditStaleServiceReferences({
  rootDir = DEFAULT_ROOT,
  activeServices = null,
} = {}) {
  const issues = [];
  const manifestPath = resolve(rootDir, "remotes.manifest.json");

  let currentServices = activeServices;
  if (!currentServices) {
    currentServices = new Set([...PROTECTED_PACKAGES]);
    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
        for (const k of Object.keys(manifest)) {
          currentServices.add(k);
        }
      } catch {
        // Ignored
      }
    }
    const packagesDir = resolve(rootDir, "packages");
    if (existsSync(packagesDir)) {
      for (const d of readdirSync(packagesDir, { withFileTypes: true })) {
        if (d.isDirectory()) currentServices.add(d.name);
      }
    }
  }

  // Known historical or removed service names
  const knownRemovedServices = ["demoService"];

  // Files to scan: all packages src/, root configs, test files
  const filesToScan = [];

  function collectFiles(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === ".git" ||
        entry.name === ".demo-backup" ||
        entry.name === ".gc-backup"
      ) {
        continue;
      }
      if (entry.isDirectory()) {
        collectFiles(fullPath);
      } else if (
        SOURCE_EXTENSIONS.has(extname(entry.name)) ||
        entry.name.endsWith(".json")
      ) {
        filesToScan.push(fullPath);
      }
    }
  }

  collectFiles(resolve(rootDir, "packages"));
  collectFiles(resolve(rootDir, "test"));
  const vitestConfig = resolve(rootDir, "vitest.config.js");
  if (existsSync(vitestConfig)) filesToScan.push(vitestConfig);

  for (const filePath of filesToScan) {
    // Skip reading auto-generated registry or the garbage collector script itself
    if (
      filePath.includes("remotesRegistry.jsx") ||
      filePath.includes("remotes.d.ts") ||
      filePath.includes("garbage-collector.js") ||
      filePath.includes("garbage-collector.test.js")
    ) {
      continue;
    }

    try {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, idx) => {
        // Skip comment lines in general unless they reference deprecated code
        for (const removed of knownRemovedServices) {
          if (
            !currentServices.has(removed) &&
            line.includes(removed) &&
            !line.includes("knownRemovedServices") &&
            !line.includes("demoServiceDir") // Skip lifecycle scripts that handle backward compatibility
          ) {
            // Check if line contains an import, alias, or mock of the removed service
            const isImportOrMock =
              /import\s+.*['"].*demoService/i.test(line) ||
              /from\s+['"].*demoService/i.test(line) ||
              /vi\.mock\(\s*['"]demoService/i.test(line) ||
              /alias\[['"]demoService/i.test(line) ||
              /['"]demoService\/App['"]/i.test(line);

            if (isImportOrMock) {
              issues.push({
                category: "stale_service_references",
                type: "dead_service_reference",
                name: removed,
                path: filePath,
                line: idx + 1,
                lineContent: line.trim(),
                description: `File references removed service '${removed}': "${line.trim()}".`,
              });
            }
          }
        }
      });
    } catch {
      // Ignore read errors
    }
  }

  return issues;
}

// ============================================================================
// 3. Lingering Environment Variables Detector
// ============================================================================
export function auditLingeringEnvVars({
  rootDir = DEFAULT_ROOT,
  activeServices = null,
} = {}) {
  const issues = [];
  const manifestPath = resolve(rootDir, "remotes.manifest.json");

  let validEnvVars = new Set();
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      for (const [name, cfg] of Object.entries(manifest)) {
        if (cfg.envVar) validEnvVars.add(cfg.envVar);
        const autoVar = `VITE_${name
          .replace(/([a-z])([A-Z])/g, "$1_$2")
          .toUpperCase()}_URL`;
        validEnvVars.add(autoVar);
      }
    } catch {
      // Ignored
    }
  }

  // Scan root and packages for .env* files
  const envFiles = [];
  function findEnvFiles(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "packages") findEnvFiles(fullPath);
        else if (dir.endsWith("packages")) findEnvFiles(fullPath);
      } else if (entry.name.startsWith(".env")) {
        envFiles.push(fullPath);
      }
    }
  }
  findEnvFiles(rootDir);

  for (const envFile of envFiles) {
    try {
      const content = readFileSync(envFile, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("#") || !trimmed) return;
        const match = trimmed.match(/^(VITE_[A-Z0-9_]+_URL)\s*=/);
        if (match) {
          const varName = match[1];
          if (!validEnvVars.has(varName)) {
            issues.push({
              category: "lingering_env_vars",
              type: "stale_env_variable",
              name: varName,
              path: envFile,
              line: idx + 1,
              lineContent: trimmed,
              description: `Lingering environment variable '${varName}' does not correspond to any active remote in remotes.manifest.json.`,
            });
          }
        }
      });
    } catch {
      // Ignored
    }
  }

  return issues;
}

// ============================================================================
// 4. Dangling / Unused Source Files Detector
// ============================================================================
export function auditDanglingFiles({ rootDir = DEFAULT_ROOT } = {}) {
  const issues = [];
  const packagesDir = resolve(rootDir, "packages");
  if (!existsSync(packagesDir)) return issues;

  const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(packagesDir, d.name));

  for (const pkgDir of packageDirs) {
    const srcDir = join(pkgDir, "src");
    if (!existsSync(srcDir)) continue;

    // Collect all source files in pkg/src
    const allFiles = new Set();
    function scanSrc(dir) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          scanSrc(full);
        } else if (SOURCE_EXTENSIONS.has(extname(entry.name))) {
          allFiles.add(full);
        }
      }
    }
    scanSrc(srcDir);

    // Identify entrypoints: main.jsx, App.jsx, index.js, vite.config.js exposed, test files
    const reachable = new Set();

    function extractImportSpecifiers(code) {
      const specifiers = new Set();
      // 1. from '...' or from "..." (matches both import and export ... from)
      for (const m of code.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)) specifiers.add(m[1]);
      // 2. dynamic import('...')
      for (const m of code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) specifiers.add(m[1]);
      // 3. side-effect import '...'
      for (const m of code.matchAll(/\bimport\s*['"]([^'"]+)['"]/g)) specifiers.add(m[1]);
      // 4. export * from '...'
      for (const m of code.matchAll(/\bexport\s*\*\s*from\s*['"]([^'"]+)['"]/g)) specifiers.add(m[1]);
      return Array.from(specifiers);
    }

    function traceImports(filePath) {
      if (reachable.has(filePath)) return;
      reachable.add(filePath);

      if (!existsSync(filePath)) return;
      let code = "";
      try {
        code = readFileSync(filePath, "utf-8");
      } catch {
        return;
      }

      const dir = resolve(filePath, "..");
      const specifiers = extractImportSpecifiers(code);

      for (const specifier of specifiers) {
        if (specifier.startsWith(".") || specifier.startsWith("@/")) {
          let candidate;
          if (specifier.startsWith("@/")) {
            const cleanPath = specifier.replace(/^@\//, "");
            candidate = resolve(srcDir, cleanPath);
          } else {
            candidate = resolve(dir, specifier);
          }
          const possible = [
            candidate,
            `${candidate}.jsx`,
            `${candidate}.js`,
            `${candidate}.tsx`,
            `${candidate}.ts`,
            join(candidate, "index.jsx"),
            join(candidate, "index.js"),
            join(candidate, "index.ts"),
          ];
          for (const p of possible) {
            if (allFiles.has(p)) {
              traceImports(p);
              break;
            }
          }
        }
      }
    }

    // Seed roots
    for (const f of allFiles) {
      if (f.endsWith(".d.ts")) continue;
      const base = relative(srcDir, f).replace(/\\/g, "/");
      // main entry, root App, index file, test files
      if (
        base === "main.jsx" ||
        base === "main.js" ||
        base === "App.jsx" ||
        base === "App.js" ||
        base === "index.js" ||
        base === "index.jsx" ||
        base === "index.ts" ||
        f.includes(".test.") ||
        f.includes(".spec.")
      ) {
        traceImports(f);
      }
    }

    // Also inspect package.json (main, module, exports)
    const pkgJsonPath = join(pkgDir, "package.json");
    if (existsSync(pkgJsonPath)) {
      try {
        const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
        const candidates = [];
        if (pkgJson.main) candidates.push(pkgJson.main);
        if (pkgJson.module) candidates.push(pkgJson.module);
        if (pkgJson.exports) {
          const checkExports = (obj) => {
            if (typeof obj === "string") candidates.push(obj);
            else if (typeof obj === "object" && obj !== null) {
              for (const v of Object.values(obj)) checkExports(v);
            }
          };
          checkExports(pkgJson.exports);
        }

        for (const c of candidates) {
          // Map ./dist/xyz.js -> ./src/xyz.js / ./src/xyz.jsx
          const sub = c.replace(/^\.\//, "").replace(/^dist\//, "");
          const subWithoutExt = sub.replace(/\.[^/.]+$/, "");
          for (const f of allFiles) {
            const rel = relative(srcDir, f).replace(/\\/g, "/");
            const relWithoutExt = rel.replace(/\.[^/.]+$/, "");
            if (relWithoutExt === subWithoutExt || rel === sub) {
              traceImports(f);
            }
          }
        }
      } catch {
        // Ignored
      }
    }

    // Also inspect tsup.config.js (entry map)
    const tsupConfigPath = join(pkgDir, "tsup.config.js");
    if (existsSync(tsupConfigPath)) {
      try {
        const tsupCode = readFileSync(tsupConfigPath, "utf-8");
        const entryMatches = [...tsupCode.matchAll(/["'](src\/[^"']+)["']/g)];
        for (const m of entryMatches) {
          const entryFile = resolve(pkgDir, m[1]);
          if (allFiles.has(entryFile)) traceImports(entryFile);
        }
      } catch {
        // Ignored
      }
    }

    // Also inspect vite.config.js (exposes map)
    const viteConfigPath = join(pkgDir, "vite.config.js");
    if (existsSync(viteConfigPath)) {
      try {
        const viteCode = readFileSync(viteConfigPath, "utf-8");
        const exposeMatches = [
          ...viteCode.matchAll(/["'](\.\/src\/[^"']+)["']/g),
        ];
        for (const m of exposeMatches) {
          const exposedFile = resolve(pkgDir, m[1]);
          if (allFiles.has(exposedFile)) traceImports(exposedFile);
        }
      } catch {
        // Ignored
      }
    }

    // Flag any source file in src/ that was not reachable
    for (const file of allFiles) {
      if (file.endsWith(".d.ts")) continue; // Ambient typing declarations
      if (!reachable.has(file)) {
        issues.push({
          category: "dangling_files",
          type: "unreachable_source_file",
          name: relative(rootDir, file).replace(/\\/g, "/"),
          path: file,
          description: `Source file '${relative(
            rootDir,
            file
          )}' has zero incoming imports from any package entry point or route.`,
        });
      }
    }
  }

  return issues;
}

// ============================================================================
// 5. Stale Build & Cache Artifacts Detector
// ============================================================================
export function auditStaleArtifacts({ rootDir = DEFAULT_ROOT } = {}) {
  const issues = [];
  const targetsToCheck = new Set([
    resolve(rootDir, "dist"),
    resolve(rootDir, ".turbo"),
  ]);

  const packagesDir = resolve(rootDir, "packages");
  if (existsSync(packagesDir)) {
    for (const dir of readdirSync(packagesDir, { withFileTypes: true })) {
      if (dir.isDirectory()) {
        targetsToCheck.add(join(packagesDir, dir.name, "dist"));
        targetsToCheck.add(join(packagesDir, dir.name, ".turbo"));
      }
    }
  }

  for (const target of targetsToCheck) {
    if (existsSync(target)) {
      issues.push({
        category: "stale_artifacts",
        type: "build_cache_directory",
        name: relative(rootDir, target).replace(/\\/g, "/"),
        path: target,
        description: `Build or cache directory '${relative(
          rootDir,
          target
        )}' is present and can be cleaned.`,
      });
    }
  }

  return issues;
}

// ============================================================================
// Safe Quarantine & Fix Engine
// ============================================================================
export function applyGarbageFixes({
  rootDir = DEFAULT_ROOT,
  issues = [],
} = {}) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = resolve(rootDir, ".gc-backup", timestamp);
  let filesQuarantined = 0;
  let manifestCleaned = false;
  let envVarsCleaned = 0;
  let cachesCleaned = 0;

  function ensureBackupDir() {
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }
  }

  for (const issue of issues) {
    // 1. Missing package in manifest: Clean key from remotes.manifest.json
    if (issue.type === "missing_package_dir") {
      const manifestPath = resolve(rootDir, "remotes.manifest.json");
      if (existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
          if (manifest[issue.name]) {
            delete manifest[issue.name];
            writeFileSync(
              manifestPath,
              JSON.stringify(manifest, null, 2) + "\n",
              "utf-8"
            );
            manifestCleaned = true;
          }
        } catch {
          // Ignored
        }
      }
    }

    // 2. Lingering Env Variable: Strip from .env file
    if (
      issue.type === "stale_env_variable" &&
      issue.path &&
      existsSync(issue.path)
    ) {
      try {
        const content = readFileSync(issue.path, "utf-8");
        const lines = content.split("\n");
        const filtered = lines.filter(
          (l) => !l.trim().startsWith(`${issue.name}=`)
        );
        if (filtered.length !== lines.length) {
          writeFileSync(issue.path, filtered.join("\n"), "utf-8");
          envVarsCleaned++;
        }
      } catch {
        // Ignored
      }
    }

    // 3. Dangling Source File: Quarantine backup then delete
    if (
      issue.type === "unreachable_source_file" &&
      issue.path &&
      existsSync(issue.path)
    ) {
      ensureBackupDir();
      const rel = relative(rootDir, issue.path);
      const dest = join(backupDir, rel);
      mkdirSync(resolve(dest, ".."), { recursive: true });
      cpSync(issue.path, dest);
      rmSync(issue.path, { force: true });
      filesQuarantined++;
    }

    // 4. Stale cache / build artifacts
    if (
      issue.type === "build_cache_directory" &&
      issue.path &&
      existsSync(issue.path)
    ) {
      try {
        rmSync(issue.path, { recursive: true, force: true });
        cachesCleaned++;
      } catch {
        // Ignored
      }
    }
  }

  if (manifestCleaned) {
    try {
      generateRemotesDts();
    } catch {
      // Ignored
    }
  }

  return {
    backupDir: filesQuarantined > 0 ? backupDir : null,
    filesQuarantined,
    manifestCleaned,
    envVarsCleaned,
    cachesCleaned,
  };
}

// ============================================================================
// Main Orchestration & CLI Runner
// ============================================================================
export function runGarbageCollector({
  rootDir = DEFAULT_ROOT,
  fix = false,
  check = false,
  quiet = false,
} = {}) {
  const issues = [
    ...auditManifestDrift({ rootDir }),
    ...auditStaleServiceReferences({ rootDir }),
    ...auditLingeringEnvVars({ rootDir }),
    ...auditDanglingFiles({ rootDir }),
    ...auditStaleArtifacts({ rootDir }),
  ];

  if (!quiet) {
    console.log("\n🧹 Monorepo Garbage Collector Audit Report");
    console.log(
      "==============================================================="
    );

    if (issues.length === 0) {
      console.log(
        "✨ Pristine monorepo! No dead code, manifest drift, or garbage found.\n"
      );
    } else {
      const grouped = {};
      for (const issue of issues) {
        if (!grouped[issue.category]) grouped[issue.category] = [];
        grouped[issue.category].push(issue);
      }

      for (const [cat, items] of Object.entries(grouped)) {
        const titles = {
          manifest_drift: "📦 Manifest & Package Drift",
          stale_service_references: "🔍 Stale Service References in Code",
          lingering_env_vars: "🌐 Lingering Environment Variables",
          dangling_files: "📄 Dangling / Unused Source Files",
          stale_artifacts: "💾 Stale Build & Cache Artifacts",
        };
        console.log(
          `\n${titles[cat] || cat} (${items.length} item${
            items.length === 1 ? "" : "s"
          }):`
        );
        for (const item of items) {
          console.log(`  • [${item.type}] ${item.description}`);
          if (item.line) {
            console.log(
              `    ↳ Location: ${relative(rootDir, item.path)}:${item.line}`
            );
          }
        }
      }

      console.log(
        "\n---------------------------------------------------------------"
      );
      console.log(`Total garbage items detected: ${issues.length}`);
    }
  }

  if (fix && issues.length > 0) {
    console.log("\n🛠️  Applying safe quarantine cleanup...");
    const fixResult = applyGarbageFixes({ rootDir, issues });
    if (fixResult.backupDir) {
      console.log(
        `   ✓ Quarantined ${
          fixResult.filesQuarantined
        } dead file(s) to: ${relative(rootDir, fixResult.backupDir)}`
      );
    }
    if (fixResult.manifestCleaned) {
      console.log(
        "   ✓ Cleaned orphaned remote keys from remotes.manifest.json."
      );
    }
    if (fixResult.envVarsCleaned > 0) {
      console.log(
        `   ✓ Removed ${fixResult.envVarsCleaned} lingering env variable(s).`
      );
    }
    if (fixResult.cachesCleaned > 0) {
      console.log(
        `   ✓ Cleaned ${fixResult.cachesCleaned} stale cache/build directory(s).`
      );
    }
    console.log("✨ Cleanup completed safely!\n");
  } else if (!fix && issues.length > 0 && !quiet) {
    console.log(
      "Tip: Run 'pnpm gc:fix' (or 'pnpm gc --fix') to automatically quarantine and resolve these issues."
    );
  }

  const fatalIssues = issues.filter((i) => i.category !== "stale_artifacts");

  if (check) {
    if (fatalIssues.length > 0) {
      if (!quiet)
        console.error(
          "\n❌ CI Check Failed: Monorepo contains unresolved garbage or dead code.\n"
        );
      return { exitCode: 1, issues: fatalIssues };
    } else {
      if (!quiet)
        console.log(
          "\n✅ CI Check Passed: Clean codebase with zero dead code or drift.\n"
        );
      return { exitCode: 0, issues };
    }
  }

  return { exitCode: 0, issues };
}

// Standalone CLI execution
if (process.argv[1]?.endsWith("garbage-collector.js")) {
  const args = process.argv.slice(2);
  const fix = args.includes("--fix");
  const check = args.includes("--check");
  const result = runGarbageCollector({ fix, check });
  if (check && result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
}
