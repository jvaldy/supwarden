describe('Parcours publics', () => {
  it('redirige vers la connexion depuis la racine', () => {
    cy.visit('/')

    cy.location('pathname').should('eq', '/connexion')
    cy.contains(/Vos trousseaux en quelque[s]? secondes\.?/i).should('be.visible')
  })

  it('affiche la page En savoir plus', () => {
    cy.visit('/en-savoir-plus')

    cy.contains('Centralisez vos trousseaux et partagez les bons accès.').should('be.visible')
    cy.contains('button', 'Ouvrir le dashboard').should('be.visible')
  })

  it('ouvre la charte graphique depuis le footer', () => {
    cy.visit('/en-savoir-plus')
    cy.contains('Charte graphique').click()

    cy.location('pathname').should('eq', '/brand')
    cy.contains('Des règles simples pour une interface cohérente.').should('be.visible')
  })
})
