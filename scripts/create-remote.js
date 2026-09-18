import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { generateRemotesDts } from "./generate-remotes-dts.js";

const MANIFEST_PATH = resolve(process.cwd(), "remotes.manifest.json");

function parseArgs() {
  const args = process.argv.slice(2);
  let name = null;
  let framework = "react";
  let routePath = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--framework" || arg === "-f") {
      framework = args[++i] || "react";
    } else if (arg === "--path" || arg === "-p") {
      routePath = args[++i];
    } else if (!arg.startsWith("-") && !name) {
      name = arg;
    }
  }

  return { name, framework: framework.toLowerCase(), routePath };
}

function getNextPort(manifest) {
  const ports = Object.values(manifest)
    .map((c) => Number(c.port))
    .filter((p) => !isNaN(p) && p > 0);
  const maxPort = ports.length > 0 ? Math.max(...ports) : 5001;
  return maxPort + 1;
}

export function createRemote({ name, framework = "react", routePath = null }) {
  if (!name) {
    console.error("❌ Error: Remote name is required. Usage: pnpm mfe:create <name> [--framework <react|vue|vanilla>] [--path </route>]");
    process.exit(1);
  }

  // Validate remote name
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    console.error(`❌ Error: Invalid remote name "${name}". Must begin with a letter and contain only alphanumeric characters, dashes, or underscores.`);
    process.exit(1);
  }

  const packageDir = resolve(process.cwd(), "packages", name);
  if (existsSync(packageDir)) {
    console.error(`❌ Error: Package directory "packages/${name}" already exists.`);
    process.exit(1);
  }

  // Load manifest & allocate port
  const manifest = existsSync(MANIFEST_PATH)
    ? JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"))
    : {};

  if (manifest[name]) {
    console.error(`❌ Error: Remote "${name}" already registered in remotes.manifest.json.`);
    process.exit(1);
  }

  const port = getNextPort(manifest);
  const finalPath = routePath || `/${name}`;
  const envVar = `VITE_${name.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase()}_URL`;

  console.log(`\n🚀 Scaffolding new Micro-Frontend Remote: ${name}`);
  console.log(`   Framework: ${framework}`);
  console.log(`   Assigned Port: ${port}`);
  console.log(`   Host Route: ${finalPath}`);
  console.log(`   Directory: packages/${name}\n`);

  mkdirSync(join(packageDir, "src", "components"), { recursive: true });

  // 1. package.json
  const packageJson = {
    name,
    private: true,
    version: "0.0.0",
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      lint: "oxlint",
      preview: `vite preview --port ${port} --strictPort`,
      watch: "vite build --watch --mode development",
      typecheck: "tsc --noEmit",
    },
    dependencies: {
      "@subrataroy100/mfe-shared": "workspace:*",
      ...(framework === "react"
        ? {
            react: "^19.2.8",
            "react-dom": "^19.2.8",
            "react-router": "^8.4.0",
          }
        : {}),
      ...(framework === "vue" ? { vue: "^3.5.13" } : {}),
    },
    devDependencies: {
      "@module-federation/vite": "^1.22.0",
      ...(framework === "react"
        ? {
            "@types/react": "^19.2.18",
            "@types/react-dom": "^19.2.7",
            "@vitejs/plugin-react": "^6.1.1",
          }
        : {}),
      ...(framework === "vue" ? { "@vitejs/plugin-vue": "^5.2.1" } : {}),
      "@tailwindcss/vite": "^4.0.0",
      "tailwindcss": "^4.0.0",
      oxlint: "^1.81.0",
      vite: "^8.3.0",
    },
  };
  writeFileSync(join(packageDir, "package.json"), JSON.stringify(packageJson, null, 2) + "\n");

  // 2. vite.config.js
  const extension = framework === "vue" ? ".vue" : framework === "vanilla" ? ".js" : ".jsx";
  const viteConfigContent = `import { defineRemoteConfig } from "@subrataroy100/mfe-shared/vite";

export default defineRemoteConfig({
  name: "${name}",
  framework: "${framework}",
  exposes: {
    "./App": "./src/App${extension}",
  },
});
`;
  writeFileSync(join(packageDir, "vite.config.js"), viteConfigContent);

  // 3. index.html
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name} (Standalone Remote)</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;
  writeFileSync(join(packageDir, "index.html"), htmlContent);

  // 4. src/index.css
  writeFileSync(join(packageDir, "src", "index.css"), `@import "tailwindcss";\n`);

  // 5. Standalone Error Boundary
  const errorBoundaryContent = `import React from "react";

export default class StandaloneErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
          <h2 style={{ color: "#e11d48" }}>🚨 ${name} Standalone Error</h2>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
`;
  writeFileSync(join(packageDir, "src", "components", "StandaloneErrorBoundary.jsx"), errorBoundaryContent);

  // 6. Root component (App.jsx / App.js / App.vue)
  if (framework === "react") {
    const appContent = `import "./index.css";
import React from "react";
import { Routes, Route } from "react-router";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-slate-900">
            <h2 className="text-xl font-bold mb-2">🚀 ${name} Remote Micro-Frontend</h2>
            <p className="text-slate-600">
              Mounted successfully at <code>${finalPath}</code> with Tailwind CSS styling.
            </p>
          </div>
        }
      />
    </Routes>
  );
}
`;
    writeFileSync(join(packageDir, "src", "App.jsx"), appContent);

    // main.jsx
    const mainContent = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import StandaloneErrorBoundary from "./components/StandaloneErrorBoundary.jsx";
import { BrowserRouter } from "react-router";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <StandaloneErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StandaloneErrorBoundary>
  </StrictMode>
);
`;
    writeFileSync(join(packageDir, "src", "main.jsx"), mainContent);
  } else {
    // Framework-agnostic / Vanilla component
    const appContent = `export function mount(container, props = {}) {
  container.innerHTML = \`
    <div style="padding: 1.5rem; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0;">
      <h2 style="color: #0f172a; margin: 0 0 0.5rem;">🚀 ${name} Remote Micro-Frontend</h2>
      <p style="color: #64748b; margin: 0;">Universal mount at <code>${finalPath}</code>.</p>
    </div>
  \`;
  return () => {
    container.innerHTML = "";
  };
}

export default { mount };
`;
    writeFileSync(join(packageDir, "src", `App${extension}`), appContent);

    const mainContent = `import "./index.css";
import { mount } from "./App${extension}";

const root = document.getElementById("root");
if (root) {
  mount(root);
}
`;
    writeFileSync(join(packageDir, "src", "main.jsx"), mainContent);
  }

  // 7. .gitignore and .oxlintrc.json
  writeFileSync(join(packageDir, ".gitignore"), "node_modules\ndist\n.turbo\n");
  writeFileSync(join(packageDir, ".oxlintrc.json"), JSON.stringify({ rules: {} }, null, 2) + "\n");

  // 8. Register in remotes.manifest.json
  manifest[name] = {
    port,
    path: finalPath,
    entry: "/remoteEntry.js",
    envVar,
    framework,
  };
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  generateRemotesDts();

  console.log(`✅ Remote "${name}" registered in remotes.manifest.json.`);
  console.log(`\nNext Steps:`);
  console.log(`  1. pnpm install`);
  console.log(`  2. pnpm dev --only ${name}   (targeted dev mode)`);
  console.log(`  3. Open http://localhost:5000${finalPath}\n`);
}

// Standalone execution
if (process.argv[1]?.endsWith("create-remote.js")) {
  const args = parseArgs();
  createRemote(args);
}
