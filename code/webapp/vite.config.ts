/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite({
      routesDirectory: './src/pages',
      generatedRouteTree: './src/routeTree.gen.ts',
      routeFilePrefix: '',
      routeFileIgnorePrefix: '-',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.VITE_PORT || '5173'),
    allowedHosts: ['.localhost', '.dev', '.local', 'cypress-ui', 'sushigo.local', 'devtest.sushigo.local'],
    strictPort: true,
    watch: {
      usePolling: true,
      ignored: ['**/routeTree.gen.ts'],
    },
    hmr: {
      // Usar el protocolo del cliente (wss:// cuando se accede por HTTPS)
      protocol: 'wss',
      // Usar el host desde variable de entorno o default a sushigo.local
      host: process.env.VITE_HMR_HOST || 'sushigo.local',
      // Puerto 443 (HTTPS por defecto) - nginx proxy redirigirá el WebSocket
      clientPort: 443,
    },
  },
  test: {
    environment: 'node',
    pool: 'threads',
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 5000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/routeTree.gen.ts',
        'src/main.tsx',
        'src/**/*.d.ts',
        'src/pages/**',
        'src/**/__tests__/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
      ],
    },
  },
})
