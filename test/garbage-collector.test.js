import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  auditManifestDrift,
  auditStaleServiceReferences,
  auditLingeringEnvVars,
  auditDanglingFiles,
  auditStaleArtifacts,
  applyGarbageFixes,
  runGarbageCollector,
} from "../scripts/garbage-collector.js";

const FIXTURE_DIR = resolve(process.cwd(), "test/fixtures/gc-sandbox");

describe("Monorepo Garbage Collector", () => {
  beforeEach(() => {
    if (existsSync(FIXTURE_DIR)) {
      rmSync(FIXTURE_DIR, { recursive: true, force: true });
    }
    mkdirSync(FIXTURE_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(FIXTURE_DIR)) {
      rmSync(FIXTURE_DIR, { recursive: true, force: true });
    }
  });

  describe("1. Manifest & Package Drift Detector", () => {
    it("detects when a package exists on disk but is omitted from remotes.manifest.json", () => {
      const packagesDir = join(FIXTURE_DIR, "packages");
      mkdirSync(join(packagesDir, "ghostRemote"), { recursive: true });
      mkdirSync(join(packagesDir, "host"), { recursive: true });
      mkdirSync(join(packagesDir, "shared"), { recursive: true });

      const manifest = {
        activeRemote: { port: 5002 },
      };

      const issues = auditManifestDrift({
        rootDir: FIXTURE_DIR,
        manifest,
      });

      const unregistered = issues.find((i) => i.type === "unregistered_package");
      expect(unregistered).toBeDefined();
      expect(unregistered.name).toBe("ghostRemote");
      // host and shared should never be flagged as unregistered
      expect(issues.some((i) => i.name === "host")).toBe(false);
      expect(issues.some((i) => i.name === "shared")).toBe(false);
    });

    it("detects when a remote is declared in manifest but package folder is missing", () => {
      const packagesDir = join(FIXTURE_DIR, "packages");
      mkdirSync(join(packagesDir, "host"), { recursive: true });

      const manifest = {
        deletedService: { port: 5005 },
      };

      const issues = auditManifestDrift({
        rootDir: FIXTURE_DIR,
        manifest,
      });

      const missing = issues.find((i) => i.type === "missing_package_dir");
      expect(missing).toBeDefined();
      expect(missing.name).toBe("deletedService");
    });

    it("recognizes apps/ directory with kebab-case naming in manifest without drift", () => {
      const appsDir = join(FIXTURE_DIR, "apps");
      mkdirSync(join(appsDir, "host"), { recursive: true });
      mkdirSync(join(appsDir, "marketing-mfe"), { recursive: true });
      mkdirSync(join(FIXTURE_DIR, "packages", "shared"), { recursive: true });

      const manifest = {
        marketingMfe: { port: 5002, dir: "marketing-mfe" },
      };

      const issues = auditManifestDrift({
        rootDir: FIXTURE_DIR,
        manifest,
      });

      expect(issues).toHaveLength(0);
    });
  });

  describe("2. Stale Service References Detector", () => {
    it("detects lingering references to removed services like demoService", () => {
      const pkgDir = join(FIXTURE_DIR, "packages", "consumerApp", "src");
      mkdirSync(pkgDir, { recursive: true });

      const testFile = join(pkgDir, "Component.test.jsx");
      writeFileSync(
        testFile,
        `import React from "react";\nvi.mock("demoService/App", () => ({}));\n`,
        "utf-8"
      );

      const issues = auditStaleServiceReferences({
        rootDir: FIXTURE_DIR,
        activeServices: new Set(["host", "shared", "consumerApp"]),
      });

      const found = issues.find((i) => i.name === "demoService");
      expect(found).toBeDefined();
      expect(found.type).toBe("dead_service_reference");
      expect(found.line).toBe(2);
    });
  });

  describe("3. Lingering Environment Variables Detector", () => {
    it("detects VITE_*_URL variables for services not in remotes.manifest.json", () => {
      writeFileSync(
        join(FIXTURE_DIR, "remotes.manifest.json"),
        JSON.stringify({ activeMfe: { port: 5002, envVar: "VITE_ACTIVE_MFE_URL" } }),
        "utf-8"
      );

      const envContent = [
        "VITE_ACTIVE_MFE_URL=http://localhost:5002",
        "VITE_GHOST_SERVICE_URL=http://localhost:9999",
        "# Commented line",
        "SOME_OTHER_VAR=123",
      ].join("\n");

      writeFileSync(join(FIXTURE_DIR, ".env"), envContent, "utf-8");

      const issues = auditLingeringEnvVars({ rootDir: FIXTURE_DIR });

      expect(issues).toHaveLength(1);
      expect(issues[0].name).toBe("VITE_GHOST_SERVICE_URL");
      expect(issues[0].line).toBe(2);
    });
  });

  describe("4. Dangling / Unused Source Files Detector", () => {
    it("identifies source files with 0 incoming imports", () => {
      const srcDir = join(FIXTURE_DIR, "packages", "myApp", "src");
      mkdirSync(srcDir, { recursive: true });

      // Entry point
      writeFileSync(
        join(srcDir, "main.jsx"),
        `import React from "react";\nimport App from "./App.jsx";\n`,
        "utf-8"
      );
      // Used file
      writeFileSync(join(srcDir, "App.jsx"), `export default function App() {}\n`, "utf-8");
      // Dead / Orphaned file
      writeFileSync(join(srcDir, "DeadComponent.jsx"), `export function Dead() {}\n`, "utf-8");

      const issues = auditDanglingFiles({ rootDir: FIXTURE_DIR });

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("unreachable_source_file");
      expect(issues[0].name).toContain("DeadComponent.jsx");
    });
  });

  describe("5. Stale Build & Cache Artifacts Detector", () => {
    it("detects lingering dist and .turbo directories", () => {
      const distDir = join(FIXTURE_DIR, "dist");
      const turboDir = join(FIXTURE_DIR, ".turbo");
      mkdirSync(distDir, { recursive: true });
      mkdirSync(turboDir, { recursive: true });

      const issues = auditStaleArtifacts({ rootDir: FIXTURE_DIR });

      expect(issues.some((i) => i.name.endsWith("dist"))).toBe(true);
      expect(issues.some((i) => i.name.endsWith(".turbo"))).toBe(true);
    });
  });

  describe("6. Safe Quarantine & Fix Engine", () => {
    it("quarantines deleted source files to .gc-backup/ before removal", () => {
      const srcDir = join(FIXTURE_DIR, "packages", "myApp", "src");
      mkdirSync(srcDir, { recursive: true });
      const deadFile = join(srcDir, "Orphan.jsx");
      writeFileSync(deadFile, "// abandoned code\n", "utf-8");

      const issues = [
        {
          type: "unreachable_source_file",
          path: deadFile,
        },
      ];

      const result = applyGarbageFixes({ rootDir: FIXTURE_DIR, issues });

      expect(result.filesQuarantined).toBe(1);
      expect(existsSync(deadFile)).toBe(false); // Removed from source tree
      expect(existsSync(result.backupDir)).toBe(true); // Safely backed up in quarantine
    });
  });

  describe("7. CLI Orchestration & Check Mode", () => {
    it("returns exitCode 1 when --check is set and issues are present", () => {
      const packagesDir = join(FIXTURE_DIR, "packages");
      mkdirSync(join(packagesDir, "orphanMfe"), { recursive: true });
      writeFileSync(
        join(FIXTURE_DIR, "remotes.manifest.json"),
        JSON.stringify({}),
        "utf-8"
      );

      const result = runGarbageCollector({
        rootDir: FIXTURE_DIR,
        check: true,
        quiet: true,
      });

      expect(result.exitCode).toBe(1);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });
});
