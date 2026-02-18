import { defineConfig } from 'cypress'

export default defineConfig({
  projectId: 'phbcj4',
  e2e: {
    baseUrl: process.env.CYPRESS_baseUrl || 'https://sushigonores.local',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') {
          // Ignorar errores de certificado SSL autofirmado
          launchOptions.args.push('--ignore-certificate-errors')
          launchOptions.args.push('--allow-insecure-localhost')
        }
        return launchOptions
      })
    },
  },
  chromeWebSecurity: false,
  video: true,
  screenshotOnRunFailure: true,
  viewportWidth: 1280,
  viewportHeight: 720,
})
