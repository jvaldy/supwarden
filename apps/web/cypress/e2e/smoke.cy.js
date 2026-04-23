describe('Smoke - parcours essentiels', () => {
  it('charge les pages publiques sans erreur bloquante', () => {
    cy.visit('/')
    cy.contains('Supwarden', { matchCase: false }).should('be.visible')

    cy.visit('/connexion')
    cy.contains('Se connecter', { matchCase: false }).should('be.visible')

    cy.visit('/inscription')
    cy.contains('Inscription', { matchCase: false }).should('be.visible')
  })

  it('expose une API health operationnelle', () => {
    cy.request('GET', `${Cypress.env('apiUrl') ?? 'http://localhost:8000'}/api/health`)
      .its('status')
      .should('eq', 200)
  })
})
