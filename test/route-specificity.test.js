import { describe, it, expect, vi } from "vitest";
import {
  normalizeRoutePath,
  resolveRemoteRoutes,
} from "../scripts/generate-remotes-dts.js";

describe("Route Specificity and Multi-Path Resolution", () => {
  describe("normalizeRoutePath", () => {
    it("preserves exact root path '/' without appending wildcard catch-all", () => {
      const result = normalizeRoutePath("/", "marketingMfe");
      expect(result.path).toBe("/");
      expect(result.urlPath).toBe("/");
      expect(result.isRoot).toBe(true);
      expect(result.isWildcard).toBe(false);
      expect(result.score).toBe(10);
    });

    it("defaults to `/${remoteName}/*` when path is empty string or omitted", () => {
      const result = normalizeRoutePath("", "marketingMfe");
      expect(result.path).toBe("/marketingMfe/*");
      expect(result.urlPath).toBe("/marketingMfe");
      expect(result.isRoot).toBe(false);
      expect(result.isWildcard).toBe(false);
    });

    it("identifies explicit catch-all wildcard '/*'", () => {
      const result = normalizeRoutePath("/*", "fallbackApp");
      expect(result.path).toBe("/*");
      expect(result.urlPath).toBe("/");
      expect(result.isWildcard).toBe(true);
      expect(result.isRoot).toBe(false);
      expect(result.score).toBe(0);
    });

    it("normalizes subpath route to include wildcard sub-route", () => {
      const result = normalizeRoutePath("/auth", "authMfe");
      expect(result.path).toBe("/auth/*");
      expect(result.urlPath).toBe("/auth");
      expect(result.isWildcard).toBe(false);
      expect(result.score).toBeGreaterThan(10);
    });

    it("preserves existing wildcard suffix without duplication", () => {
      const result = normalizeRoutePath("/spaces/*", "classroomMfe");
      expect(result.path).toBe("/spaces/*");
      expect(result.urlPath).toBe("/spaces");
    });
  });

  describe("resolveRemoteRoutes", () => {
    it("expands multi-path declarations (paths: [...]) into discrete routes", () => {
      const manifest = {
        communicationMfe: {
          port: 5005,
          paths: ["/messages", "/saved"],
        },
      };

      const routes = resolveRemoteRoutes(manifest);
      expect(routes).toHaveLength(2);
      expect(routes.map((r) => r.path)).toContain("/messages/*");
      expect(routes.map((r) => r.path)).toContain("/saved/*");
      expect(routes.every((r) => r.name === "communicationMfe")).toBe(true);
      expect(routes[0].key).not.toBe(routes[1].key);
    });

    it("sorts routes by specificity: deep subpaths -> exact root -> wildcard catch-all", () => {
      const manifest = {
        catchAllMfe: {
          port: 5099,
          path: "/*",
        },
        marketingMfe: {
          port: 5002,
          path: "/",
        },
        authMfe: {
          port: 5003,
          path: "/auth",
        },
        accountMfe: {
          port: 5006,
          paths: ["/profile", "/users/:userId/settings"],
        },
      };

      const routes = resolveRemoteRoutes(manifest);

      // Deepest subpath must come first
      expect(routes[0].path).toBe("/users/:userId/settings/*");
      expect(routes[0].name).toBe("accountMfe");

      // Mid-level subpaths next
      const middlePaths = routes.slice(1, 4).map((r) => r.path);
      expect(middlePaths).toContain("/profile/*");
      expect(middlePaths).toContain("/auth/*");

      // Exact root route "/" comes after specific subpaths but before wildcard
      const rootIndex = routes.findIndex((r) => r.path === "/");
      const catchAllIndex = routes.findIndex((r) => r.path === "/*");

      expect(rootIndex).toBeGreaterThan(0);
      expect(catchAllIndex).toBe(routes.length - 1);
      expect(routes[catchAllIndex].name).toBe("catchAllMfe");
    });

    it("prevents sequential wildcard hijacking when multiple root services are registered", () => {
      const manifest = {
        rootServiceA: {
          port: 5002,
          path: "/",
        },
        communicationMfe: {
          port: 5005,
          paths: ["/messages", "/saved"],
        },
        authMfe: {
          port: 5003,
          path: "/auth",
        },
      };

      const routes = resolveRemoteRoutes(manifest);

      // Subpaths must precede rootServiceA so they are never hijacked
      const pathsInOrder = routes.map((r) => r.path);
      const messagesIdx = pathsInOrder.indexOf("/messages/*");
      const savedIdx = pathsInOrder.indexOf("/saved/*");
      const authIdx = pathsInOrder.indexOf("/auth/*");
      const rootIdx = pathsInOrder.indexOf("/");

      expect(messagesIdx).toBeLessThan(rootIdx);
      expect(savedIdx).toBeLessThan(rootIdx);
      expect(authIdx).toBeLessThan(rootIdx);
    });

    it("warns when multiple catch-all wildcards ('/*') are declared", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const manifest = {
        app1: { port: 5001, path: "/*" },
        app2: { port: 5002, path: "/*" },
      };

      resolveRemoteRoutes(manifest);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Sequential Wildcard Collision")
      );

      warnSpy.mockRestore();
    });
  });
});
