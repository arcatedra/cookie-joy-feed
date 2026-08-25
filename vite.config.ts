// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ plugins: [...], vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

// PWA (installable + offline app shell). Uses vite-plugin-pwa's
// injectManifest strategy: the SW source lives at src/sw.ts and is compiled
// into a single /sw.js. Registration is manual and guarded — see
// src/lib/pwa-register.ts — and never runs in dev/preview (devOptions off).
export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  plugins: [
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      // We manage registration ourselves (guarded), so the plugin must not
      // inject its own register script into the HTML.
      injectRegister: false,
      // We ship our own static manifest at public/manifest.webmanifest.
      manifest: false,
      // Never emit or register a service worker in dev/preview.
      devOptions: { enabled: false },
      injectManifest: {
        swSrc: "src/sw.ts",
        // Precache the app shell only: JS/CSS/HTML/fonts/icons. Large media
        // (jpg/mp4 reels, product photos) is runtime-cached on demand.
        // NOTE: flat patterns (no {a,b} braces) — the project's security
        // override on brace-expansion breaks workbox-build's brace handling.
        globPatterns: [
          "**/*.js",
          "**/*.css",
          "**/*.html",
          "**/*.svg",
          "**/*.woff",
          "**/*.woff2",
          "**/*.ico",
          "**/*.webmanifest",
          "**/*.png",
        ],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
});
