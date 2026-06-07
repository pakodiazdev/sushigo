import { defineConfig } from 'cypress'
import { execSync } from 'child_process'
import * as http from 'http'

// Container name set by sushigo-dev-lab's start-e2e.sh.
// Example: E2E_CONTAINER=e2e-api-a npm run cypress:open:devlab
const E2E_CONTAINER = process.env.E2E_CONTAINER || 'e2e-api-a'

// Vite E2E port set by start-e2e.sh (5181–5188 per slot).
const VITE_PORT = process.env.VITE_PORT || '5181'

// Mailpit (shared Docker service) exposes the same HTTP API as Mailhog.
const MAILPIT_HOST = process.env.CYPRESS_mailpitHost || 'localhost'
const MAILPIT_PORT = parseInt(process.env.CYPRESS_mailpitPort || '8025', 10)

// /app/artisan is the absolute path inside the e2e container
// (volume maps workspaces/sushigo-x/code/api → /app, WORKDIR /app in Dockerfile)
const artisan = (cmd: string, opts: { timeout?: number } = {}) =>
  execSync(`docker exec ${E2E_CONTAINER} php /app/artisan ${cmd}`, {
    timeout: opts.timeout ?? 60_000,
    stdio: 'inherit',
  })

export default defineConfig({
  projectId: 'phbcj4',
  e2e: {
    baseUrl: process.env.CYPRESS_baseUrl || `http://localhost:${VITE_PORT}`,
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    setupNodeEvents(on, config) {
      on('task', {
        log(message) {
          console.log(message)
          return null
        },

        /**
         * Full reset: migrate:fresh + seed.
         * Slow (~30s). Use only when schema has changed.
         * Usage: cy.task('db:reset')
         */
        'db:reset': () => {
          console.log(`[db:reset] Running migrate:fresh --seed on ${E2E_CONTAINER}...`)
          artisan('migrate:fresh --seed', { timeout: 180_000 })
          return null
        },

        /**
         * Fast reset: truncate + selective seed (no migration). ~3–5s.
         * Usage:
         *   cy.task('test:reset')                    → core only
         *   cy.task('test:reset', 'attendance')      → core + attendance
         *   cy.task('test:reset', 'attendance,cash') → core + attendance + cash
         */
        'test:reset': (seeders: string | null) => {
          const flag = seeders ? ` --seeders=${seeders}` : ''
          console.log(`[test:reset] Running test:reset${flag} on ${E2E_CONTAINER}...`)
          artisan(`test:reset${flag}`, { timeout: 120_000 })
          return null
        },

        /**
         * Seed only (no migration).
         * Usage: cy.task('db:seed')
         */
        'db:seed': () => {
          console.log(`[db:seed] Running db:seed on ${E2E_CONTAINER}...`)
          artisan('db:seed', { timeout: 60_000 })
          return null
        },

        /**
         * Get password reset link via artisan tinker inside the E2E container.
         * No Mailpit dependency — instant and deterministic.
         * Usage: cy.task('test:getResetLink', 'user@example.com')
         */
        'test:getResetLink': (email: string) => {
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
          if (!emailRegex.test(email)) {
            console.error(`[test:getResetLink] Invalid email format: ${email}`)
            return null
          }
          console.log(`[test:getResetLink] Fetching reset link for ${email}...`)
          try {
            const result = execSync(
              `docker exec ${E2E_CONTAINER} php /app/artisan tinker --execute="echo app(App\\\\Contracts\\\\PasswordResetTokenRecorder::class)->retrieve('${email}') ?? 'NULL';"`,
              { timeout: 10_000, encoding: 'utf-8' }
            ).trim()
            if (result === 'NULL' || !result) {
              console.log(`[test:getResetLink] No reset link found for ${email}`)
              return null
            }
            console.log(`[test:getResetLink] Reset link found`)
            return result
          } catch {
            console.error(`[test:getResetLink] Error fetching reset link`)
            return null
          }
        },

        /**
         * Get password reset link from Mailpit.
         * Mailpit exposes the same /api/v2/messages endpoint as Mailhog.
         * Usage: cy.task('mailhog:getResetLink', 'user@example.com')
         */
        'mailhog:getResetLink': (email: string) => {
          const decodeQuotedPrintable = (str: string) =>
            str
              .replace(/=\r?\n/g, '')
              .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
                String.fromCharCode(parseInt(hex, 16))
              )

          return new Promise((resolve, reject) => {
            const req = http.request(
              { hostname: MAILPIT_HOST, port: MAILPIT_PORT, path: '/api/v2/messages', method: 'GET' },
              (res) => {
                let data = ''
                res.on('data', (chunk) => (data += chunk))
                res.on('end', () => {
                  try {
                    const json = JSON.parse(data)
                    for (const msg of json.items || []) {
                      const to = msg.Content?.Headers?.To?.[0] || ''
                      if (to.includes(email)) {
                        const body = decodeQuotedPrintable(msg.Content?.Body || '')
                        const match = body.match(
                          /https?:\/\/[^\s"<>]+\/reset-password\?t=[A-Za-z0-9.]+/
                        )
                        if (match) {
                          console.log(`[mailpit] Found reset link for ${email}`)
                          resolve(match[0])
                          return
                        }
                      }
                    }
                    console.log(`[mailpit] No reset link found for ${email}`)
                    resolve(null)
                  } catch (e) {
                    reject(e)
                  }
                })
              }
            )
            req.on('error', reject)
            req.end()
          })
        },

        /**
         * Clear all emails from Mailpit.
         * Usage: cy.task('mailhog:clear')
         */
        'mailhog:clear': () => {
          return new Promise((resolve, reject) => {
            const req = http.request(
              { hostname: MAILPIT_HOST, port: MAILPIT_PORT, path: '/api/v1/messages', method: 'DELETE' },
              (res) => {
                res.on('data', () => {})
                res.on('end', () => {
                  console.log('[mailpit] Cleared all messages')
                  resolve(null)
                })
              }
            )
            req.on('error', reject)
            req.end()
          })
        },
      })

      return config
    },
  },
  chromeWebSecurity: false,
  video: false,
  screenshotOnRunFailure: true,
  viewportWidth: 1280,
  viewportHeight: 720,
})
