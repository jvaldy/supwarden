describe('Parcours publics', () => {
  it('redirige vers la connexion depuis la racine', () => {
    cy.visit('/')

    cy.location('pathname').should('eq', '/connexion')
    cy.contains('Retrouvez vos trousseaux en quelques secondes.').should('be.visible')
  })

  it('affiche la page En savoir plus', () => {
    cy.visit('/en-savoir-plus')

    cy.contains('Simplifiez le partage des accès dans votre équipe.').should('be.visible')
    cy.contains('button', 'Découvrir').should('be.visible')
  })

  it('ouvre la charte graphique depuis le footer', () => {
    cy.visit('/en-savoir-plus')
    cy.contains('Charte graphique').click()

    cy.location('pathname').should('eq', '/brand')
    cy.contains('Charte graphique Supwarden').should('be.visible')
  })
})
