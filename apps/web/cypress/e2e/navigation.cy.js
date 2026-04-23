import { registerUserThroughApi, visitWithSession } from '../helpers/session.js'

function visitDashboard(session) {
  cy.intercept('GET', 'http://localhost:8000/api/me').as('meRequest')
  visitWithSession('/dashboard', session)
  cy.wait('@meRequest')
  cy.contains('Bienvenue dans votre espace Supwarden.', { timeout: 30000 }).should('be.visible')
}

describe('Navigation connectée', () => {
  it('ouvre et referme le menu Mon compte', () => {
    registerUserThroughApi().then((session) => {
      visitDashboard(session)

      cy.contains('button', 'Mon compte').click()
      cy.contains('button', 'Profil').should('be.visible')
      cy.get('body').click(0, 0)
      cy.contains('button', 'Profil').should('not.exist')
    })
  })

  it('ouvre la page profil depuis le menu Mon compte', () => {
    registerUserThroughApi().then((session) => {
      visitDashboard(session)

      cy.contains('button', 'Mon compte').click()
      cy.contains('button', 'Profil').click()

      cy.location('pathname', { timeout: 30000 }).should('eq', '/profil')
      cy.contains('Gérez vos informations personnelles.', { timeout: 30000 }).should('be.visible')
    })
  })

  it("déconnecte l'utilisateur depuis le menu Mon compte", () => {
    registerUserThroughApi().then((session) => {
      visitDashboard(session)

      cy.contains('button', 'Mon compte').click()
      cy.contains('button', /Se déconnecter/i).click()

      cy.location('pathname', { timeout: 30000 }).should('eq', '/connexion')
      cy.contains(/Vos trousseaux en quelque[s]? secondes\.?/i).should('be.visible')
    })
  })
})
