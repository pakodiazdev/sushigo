import { defineConfig } from 'cypress'
import { execSync } from 'child_process'
import * as http from 'http'

// Container name that runs the Laravel app (dev or e2e environment)
const CONTAINER = process.env.CYPRESS_container || 'devtest_container'

// Mailhog API host for fetching emails
// - In cypress-ui (devtest): uses host.docker.internal or localhost:8025 via host-gateway
// - Can be overridden via CYPRESS_mailhogHost env var
const MAILHOG_HOST = process.env.CYPRESS_mailhogHost || 'host.docker.internal'
const MAILHOG_PORT = parseInt(process.env.CYPRESS_mailhogPort || '8025', 10)

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

        /**
         * Get password reset link from Mailhog for a given email.
         * Usage: cy.task('mailhog:getResetLink', 'user@example.com')
         * Returns: The reset URL or null if not found.
         */
        'mailhog:getResetLink': (email) => {
          // Helper to decode quoted-printable encoding
          const decodeQuotedPrintable = (str) => {
            // Remove soft line breaks (= at end of line)
            let decoded = str.replace(/=\r?\n/g, '')
            // Decode =XX hex sequences
            decoded = decoded.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
              return String.fromCharCode(parseInt(hex, 16))
            })
            return decoded
          }

          return new Promise((resolve, reject) => {
            const req = http.request(
              {
                hostname: MAILHOG_HOST,
                port: MAILHOG_PORT,
                path: '/api/v2/messages',
                method: 'GET',
              },
              (res) => {
                let data = ''
                res.on('data', (chunk) => (data += chunk))
                res.on('end', () => {
                  try {
                    const json = JSON.parse(data)
                    const messages = json.items || []
                    // Find the most recent email to this recipient
                    for (const msg of messages) {
                      const to = msg.Content?.Headers?.To?.[0] || ''
                      if (to.includes(email)) {
                        // Extract reset link from body (HTML or plain text)
                        // First decode quoted-printable encoding
                        const rawBody = msg.Content?.Body || ''
                        const body = decodeQuotedPrintable(rawBody)

                        // Match the reset link - the token format is {plainToken}.{selector}
                        const match = body.match(/https?:\/\/[^\s"<>]+\/reset-password\?t=[A-Za-z0-9.]+/)
                        if (match) {
                          console.log(`[mailhog] Found reset link for ${email}: ${match[0]}`)
                          resolve(match[0])
                          return
                        }
                      }
                    }
                    console.log(`[mailhog] No reset link found for ${email}`)
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
         * Clear all emails from Mailhog.
         * Usage: cy.task('mailhog:clear')
         */
        'mailhog:clear': () => {
          return new Promise((resolve, reject) => {
            const req = http.request(
              {
                hostname: MAILHOG_HOST,
                port: MAILHOG_PORT,
                path: '/api/v1/messages',
                method: 'DELETE',
              },
              (res) => {
                res.on('data', () => { })
                res.on('end', () => {
                  console.log('[mailhog] Cleared all messages')
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
  video: true,
  screenshotOnRunFailure: true,
  viewportWidth: 1280,
  viewportHeight: 720,
})
