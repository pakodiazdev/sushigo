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
    strictPort: true,
    watch: {
      usePolling: true,
    },
    hmr: {
      clientPort: parseInt(process.env.VITE_PORT || '5173'),
      host: 'localhost',
    },
  },
})
