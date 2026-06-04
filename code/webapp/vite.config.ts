/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import path from 'path'
import { execSync } from 'child_process'

const VIRTUAL_GIT_BRANCH_ID = 'virtual:git-branch'
const RESOLVED_GIT_BRANCH_ID = '\0' + VIRTUAL_GIT_BRANCH_ID

function getGitDir(): string {
    try {
        return execSync('git rev-parse --git-dir', { encoding: 'utf-8' }).trim()
    } catch {
        return '.git'
    }
}

function getCurrentBranch(): string {
    try {
        return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()
    } catch {
        return ''
    }
}

function gitBranchPlugin(): Plugin {
    return {
        name: 'git-branch',
        resolveId(id) {
            if (id === VIRTUAL_GIT_BRANCH_ID) return RESOLVED_GIT_BRANCH_ID
        },
        load(id) {
            if (id === RESOLVED_GIT_BRANCH_ID) {
                return `export const gitBranch = ${JSON.stringify(getCurrentBranch())}`
            }
        },
        configureServer(server) {
            const gitHeadPath = path.resolve(getGitDir(), 'HEAD')
            server.watcher.add(gitHeadPath)
            server.watcher.on('change', (file) => {
                if (file === gitHeadPath) {
                    const mod = server.moduleGraph.getModuleById(RESOLVED_GIT_BRANCH_ID)
                    if (mod) server.moduleGraph.invalidateModule(mod)
                    server.hot.send({ type: 'full-reload' })
                }
            })
        },
    }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite does not expose .env vars in process.env when evaluating vite.config.ts,
  // so we load them explicitly with loadEnv before branching on any VITE_* value.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      gitBranchPlugin(),
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
      port: parseInt(env.VITE_PORT || '5173'),
      allowedHosts: ['.localhost', '.dev', '.local', 'cypress-ui', 'sushigo.local', 'devtest.sushigo.local'],
      strictPort: true,
      watch: {
        usePolling: true,
        ignored: ['**/routeTree.gen.ts'],
      },
      // When VITE_HMR_HOST is set (Docker/nginx environments), use explicit config.
      // When unset (direct local dev), let Vite auto-detect (default behavior).
      hmr: env.VITE_HMR_HOST
        ? {
            protocol: (env.VITE_HMR_PROTOCOL as 'ws' | 'wss') || 'wss',
            host: env.VITE_HMR_HOST,
            clientPort: parseInt(env.VITE_HMR_PORT || '443'),
          }
        : true,
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
  }
})
