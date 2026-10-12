import type { CapacitorConfig } from "@capacitor/cli";

// Native iOS wrapper around the built web app (dist). No server.url: the app is bundled, not remote.
const config: CapacitorConfig = {
  appId: "com.growsafe.app",
  appName: "GrowSafe",
  webDir: "dist",
  ios: {
    scheme: "capacitor",
  },
};

export default config;
