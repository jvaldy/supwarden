import { registerUserThroughApi, visitWithSession } from '../helpers/session.js'

describe('Tableau de bord', () => {
  it('affiche les informations du compte connecté', () => {
    registerUserThroughApi({ firstname: 'Camille', lastname: 'Durand' }).then((session) => {
      cy.intercept('GET', 'http://localhost:8000/api/me').as('meRequest')

      visitWithSession('/dashboard', session)

      cy.wait('@meRequest')
      cy.contains('Bienvenue dans votre espace Supwarden.', { timeout: 30000 }).should('be.visible')
      cy.contains('Vous êtes connectés en tant que').should('be.visible')
      cy.contains('Camille Durand').should('be.visible')
    })
  })

  it("n'affiche pas la zone administrateur pour un compte standard", () => {
    registerUserThroughApi().then((session) => {
      cy.intercept('GET', 'http://localhost:8000/api/me').as('meRequest')

      visitWithSession('/dashboard', session)

      cy.wait('@meRequest')
      cy.contains('Bienvenue dans votre espace Supwarden.', { timeout: 30000 }).should('be.visible')
      cy.contains('Espace administrateur').should('not.exist')
    })
  })
})
