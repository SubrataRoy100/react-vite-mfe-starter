import { defineConfig } from "tsup";
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

export default defineConfig({
  entry: {
    index: "src/index.js",
    "events/index": "src/events/mfe-events.js",
    "events/core": "src/events/mfe-events-core.js",
    "constants/index": "src/constants/config.js",
    "adapters/index": "src/adapters/index.js",
    "components/Button": "src/components/Button.jsx",
    "vite/index": "src/vite/index.js",
  },
  format: ["esm", "cjs"],
  clean: true,
  splitting: false,
  sourcemap: true,
  target: "es2022",
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "vite",
    "@tailwindcss/vite",
    "@module-federation/vite",
    "@vitejs/plugin-react",
  ],
  async onSuccess() {
    const baseDir = import.meta.dirname || process.cwd();

    // Directly copy tracked TypeScript definition files from src/ to dist/
    const copyPairs = [
      ["src/index.d.ts", "dist/index.d.ts"],
      ["src/adapters/index.d.ts", "dist/adapters/index.d.ts"],
      ["src/events/mfe-events.d.ts", "dist/events/index.d.ts"],
      ["src/events/mfe-events-core.d.ts", "dist/events/core.d.ts"],
      ["src/constants/config.d.ts", "dist/constants/index.d.ts"],
      ["src/components/Button.d.ts", "dist/components/Button.d.ts"],
      ["src/vite/index.d.ts", "dist/vite/index.d.ts"],
    ];

    for (const [src, dest] of copyPairs) {
      const srcPath = resolve(baseDir, src);
      const destPath = resolve(baseDir, dest);
      if (existsSync(srcPath)) {
        mkdirSync(dirname(destPath), { recursive: true });
        copyFileSync(srcPath, destPath);
      }
    }
  },
});
