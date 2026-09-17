import { describe, it, expect } from "vitest";
import {
  loadManifest,
  getRemoteNames,
  getTargetedManifest,
  getBuildFilterArgs,
  getDevCommands,
} from "../scripts/manifest.js";

describe("scripts/manifest", () => {
  it("loads the remotes manifest correctly", () => {
    const manifest = loadManifest();
    expect(manifest).toBeDefined();
    expect(typeof manifest).toBe("object");
    if (manifest.demoService) {
      expect(manifest.demoService.port).toBe(5001);
      expect(manifest.demoService.entry).toBe("/remoteEntry.js");
    }
  });

  it("extracts remote names accurately", () => {
    const names = getRemoteNames({
      serviceA: {},
      serviceB: {},
    });
    expect(names).toEqual(["serviceA", "serviceB"]);
  });

  it("filters manifest down to targeted remote correctly", () => {
    const mockManifest = {
      auth: { port: 5001 },
      billing: { port: 5002 },
    };
    const targeted = getTargetedManifest(mockManifest, "billing");
    expect(targeted).toEqual({ billing: { port: 5002 } });
  });

  it("throws descriptive error when targeted remote is not in manifest", () => {
    const mockManifest = { auth: { port: 5001 } };
    expect(() => getTargetedManifest(mockManifest, "unknown")).toThrow(
      /Remote "unknown" not found in remotes.manifest.json/
    );
  });

  it("returns build filter arguments for all remotes", () => {
    const args = getBuildFilterArgs({
      remote1: {},
      remote2: {},
    });
    expect(args).toEqual(["--filter", "remote1", "--filter", "remote2"]);
  });

  it("returns empty build filter arguments when manifest is empty", () => {
    expect(getBuildFilterArgs({})).toEqual([]);
  });

  it("generates watch and preview dev commands for all remotes", () => {
    const commands = getDevCommands({
      demoService: { port: 5001 },
    });
    expect(commands).toHaveLength(2);
    expect(commands[0]).toMatchObject({
      command: "pnpm --filter demoService watch",
      name: "demoService:watch",
    });
    expect(commands[1]).toMatchObject({
      command: "pnpm --filter demoService preview",
      name: "demoService:preview",
    });
  });
});
