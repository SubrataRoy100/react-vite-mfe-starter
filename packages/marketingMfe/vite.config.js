import { defineRemoteConfig } from "@subrataroy100/mfe-shared/vite";

export default defineRemoteConfig({
  name: "marketingMfe",
  exposes: {
    "./App": "./src/App.jsx",
  },
});
