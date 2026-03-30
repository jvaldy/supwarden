import { registerUserThroughApi, visitWithSession } from '../helpers/session.js'

describe('Tableau de bord', () => {
  it('affiche les informations du compte connecté', () => {
    registerUserThroughApi({ firstname: 'Camille', lastname: 'Durand' }).then((session) => {
      visitWithSession('/dashboard', session)

      cy.contains('Bienvenue dans votre espace Supwarden.').should('be.visible')
      cy.contains('Camille Durand').should('be.visible')
      cy.contains(session.user.email).should('be.visible')
      cy.contains('Actif').should('be.visible')
    })
  })

  it("n'affiche pas la zone administrateur pour un compte standard", () => {
    registerUserThroughApi().then((session) => {
      visitWithSession('/dashboard', session)

      cy.contains('Espace administrateur').should('not.exist')
    })
  })
})
