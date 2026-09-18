import { defineRemoteConfig } from "@subrataroy100/mfe-shared/vite";

export default defineRemoteConfig({
  name: "authMfe",
  exposes: {
    "./App": "./src/App.jsx",
  },
});
