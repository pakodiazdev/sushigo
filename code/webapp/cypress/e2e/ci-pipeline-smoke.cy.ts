/**
 * CI pipeline smoke (#560)
 *
 * A deliberately tiny happy-path E2E whose only job is to give the unified CI DAG's
 * `[e2e-test]` and `[wip]` targeted-Cypress paths a real spec to select and run
 * (`.github/workflows/ci.yml` + `_e2e-ci.yml`). It asserts nothing more than "the app
 * shell is served" — no auth, no seeded data, no `test:reset` — so it stays fast and
 * stable enough to act as a pipeline canary in the full suite too.
 */
describe('CI pipeline smoke (#560)', () => {
  it('serves the app and renders a non-empty document title', () => {
    cy.visit('/')
    cy.title().should('not.be.empty')
  })
})
