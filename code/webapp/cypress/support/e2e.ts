// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Grep plugin — filter tests by name or tag from CLI
// Usage: --env grep="Logout"  or  --env grep="@smoke"
import registerCypressGrep from '@cypress/grep'
registerCypressGrep()

// Prevenir redirecciones a HTTPS
Cypress.on('window:before:load', (win) => {
  // Interceptar y modificar las redirecciones HTTPS
  const originalFetch = win.fetch
  win.fetch = function(...args) {
    if (args[0] && typeof args[0] === 'string' && args[0].startsWith('https://')) {
      args[0] = args[0].replace('https://', 'http://')
    }
    return originalFetch.apply(this, args)
  }
})

// Deshabilitar strict-transport-security
Cypress.on('window:before:load', (win) => {
  Object.defineProperty(win.navigator, 'onLine', {
    get: () => true,
  })
})

// Ignore Vite HMR WebSocket errors in e2e — these are dev-server artifacts,
// not application errors. The WebSocket for Hot Module Replacement fails when
// running behind an HTTPS nginx reverse-proxy in the e2e container, but the
// app itself still works correctly.
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('WebSocket') || err.message.includes('websocket')) {
    return false
  }
})

// Alternatively you can use CommonJS syntax:
// require('./commands')
