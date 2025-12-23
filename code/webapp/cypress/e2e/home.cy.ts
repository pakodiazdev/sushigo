describe('Home Page', () => {
  it('should load successfully', () => {
    cy.visit('/')
    cy.contains('Bienvenido').should('be.visible')
  })

  it('should have a title', () => {
    cy.visit('/')
    cy.title().should('not.be.empty')
  })
})
