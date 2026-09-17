import { defineRemoteConfig } from "@subrataroy100/mfe-shared/vite";

export default defineRemoteConfig({
  name: "demoService",
  // Port is auto-inferred from remotes.manifest.json (port 5001),
  // but can also be specified directly if needed.
  exposes: {
    "./App": "./src/App.jsx",
    "./MfeDevWidget": "./src/components/MfeDevWidget.jsx",
  },
});
