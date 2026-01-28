import path from "node:path";

import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icons/*.png'],
      manifest: false, // We use the static manifest.webmanifest
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /^wss?:\/\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/.*\.well-known\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'lnurl',
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    onConsoleLog(log) {
      return !log.includes("React Router Future Flag Warning");
    },
    env: {
      DEBUG_PRINT_LIMIT: '0', // Suppress DOM output that exceeds AI context windows
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Exclude API directory from client build
    rollupOptions: {
      external: (id) => {
        // Exclude api/ directory from bundling
        if (id.startsWith('./api/') || id.startsWith('../api/') || id.includes('/api/')) {
          return true;
        }
        return false;
      },
    },
  },
  // Exclude api directory from being processed by Vite
  publicDir: 'public',
}));
