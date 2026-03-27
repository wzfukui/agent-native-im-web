/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')) as { version?: string }
    return pkg.version || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

function readGitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return 'unknown'
  }
}

const appVersion = process.env.VITE_APP_VERSION || readPackageVersion()
const appCommit = process.env.VITE_APP_COMMIT || readGitCommit()
const appBuildTime = new Date().toISOString()

export default defineConfig({
  plugins: [
    {
      name: 'ani-build-info-manifest',
      closeBundle() {
        writeFileSync(
          path.resolve(__dirname, 'dist/build-info.json'),
          JSON.stringify({
            version: appVersion,
            commit: appCommit,
            buildTime: appBuildTime,
          }, null, 2),
          'utf-8',
        )
      },
    },
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Exclude heavy library chunks (mermaid, katex, cytoscape, d3, etc.)
        // from precache. They load on-demand and get runtime-cached in sw.ts.
        globIgnores: [
          // Core libraries
          '**/mermaid*',
          '**/katex*',
          '**/cytoscape*',
          '**/treemap*',
          '**/elk*',
          '**/dagre*',
          '**/cose-bilkent*',
          // Diagram renderers & definitions
          '**/*Diagram*',
          '**/*diagram*',
          '**/*-definition-*',
          // Mermaid/d3 internal chunks & helpers (layout, graph, arc, etc.)
          '**/layout-*',
          '**/graph-*',
          '**/arc-*',
          '**/ordinal-*',
          '**/linear-*',
          '**/defaultLocale-*',
          '**/clone-*',
          '**/init-*',
          '**/channel-*',
          '**/_base*',
          // All vendor chunk splits (mermaid/d3 internals); the main app
          // entry is "index-*" and is not affected by this pattern.
          '**/chunk-*',
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_COMMIT__: JSON.stringify(appCommit),
    __APP_BUILD_TIME__: JSON.stringify(appBuildTime),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    exclude: ['e2e/**', 'node_modules/**'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.ANI_DEV_PROXY_TARGET ?? 'https://agent-native.im',
        changeOrigin: true,
        ws: true,
      },
      '/files': {
        target: process.env.ANI_DEV_PROXY_TARGET ?? 'https://agent-native.im',
        changeOrigin: true,
      },
      '/avatar-files': {
        target: process.env.ANI_DEV_PROXY_TARGET ?? 'https://agent-native.im',
        changeOrigin: true,
      },
    },
  },
})
