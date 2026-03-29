import { defineConfig } from 'cypress'
import { execSync } from 'child_process'

// Container name that runs the Laravel app (dev or e2e environment)
const CONTAINER = process.env.CYPRESS_container || 'devtest_container'

export default defineConfig({
  projectId: 'phbcj4',
  e2e: {
    baseUrl: process.env.CYPRESS_baseUrl || 'https://sushigonores.local',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    setupNodeEvents(on, config) {
      // ── Browser flags ──────────────────────────────────────────────
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') {
          launchOptions.args.push('--ignore-certificate-errors')
          launchOptions.args.push('--allow-insecure-localhost')
        }
        return launchOptions
      })

      // ── Database tasks ─────────────────────────────────────────────
      // Use cy.task('db:reset') instead of cy.exec() — runs in Node.js
      // context (same process as Cypress), faster and more reliable.
      on('task', {
        /**
         * Full reset: migrate:fresh + seed.
         * Slow (~30s). Call once per spec file in before(), not beforeEach().
         * Usage: cy.task('db:reset')
         */
        'db:reset': () => {
          console.log(`[db:reset] Running migrate:fresh --seed on ${CONTAINER}...`)
          execSync(
            `docker exec ${CONTAINER} php /app/code/api/artisan migrate:fresh --seed --env=testing`,
            { timeout: 90_000, stdio: 'inherit' }
          )
          return null
        },

        /**
         * Seed only (no migration). Faster when schema is already fresh.
         * Usage: cy.task('db:seed')
         */
        'db:seed': () => {
          console.log(`[db:seed] Running db:seed on ${CONTAINER}...`)
          execSync(
            `docker exec ${CONTAINER} php /app/code/api/artisan db:seed --env=testing`,
            { timeout: 60_000, stdio: 'inherit' }
          )
          return null
        },
      })

      return config
    },
  },
  chromeWebSecurity: false,
  video: true,
  screenshotOnRunFailure: true,
  viewportWidth: 1280,
  viewportHeight: 720,
})
