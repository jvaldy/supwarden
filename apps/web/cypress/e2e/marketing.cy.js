describe('Parcours publics', () => {
  it('affiche la landing page', () => {
    cy.visit('/')

    cy.contains('Simplifiez le partage des accès dans votre équipe.').should('be.visible')
    cy.contains('button', 'Découvrir').should('be.visible')
  })

  it('ouvre la page connexion depuis la landing', () => {
    cy.visit('/')
    cy.contains('button', 'Découvrir').click()

    cy.location('pathname').should('eq', '/connexion')
    cy.contains('Retrouvez vos trousseaux en quelques secondes.').should('be.visible')
  })

  it('ouvre la charte graphique depuis le footer', () => {
    cy.visit('/')
    cy.contains('Charte graphique').click()

    cy.location('pathname').should('eq', '/brand')
    cy.contains('Charte graphique Supwarden').should('be.visible')
  })
})