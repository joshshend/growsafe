import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import { startPersistence } from "./store/store";
import "./index.css";
import { isNative } from "./native/platform";

void startPersistence();

// The service worker is for the browser/PWA only; the native app bundles its files.
if (!isNative()) void import("virtual:pwa-register").then((m) => m.registerSW({ immediate: true }));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
