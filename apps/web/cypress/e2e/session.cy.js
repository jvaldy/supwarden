import { registerUserThroughApi, visitWithSession } from '../helpers/session.js'

function waitForAuthenticatedRedirect() {
  cy.intercept('GET', 'http://localhost:8000/api/me').as('meRequest')
  cy.wait('@meRequest')
  cy.location('pathname', { timeout: 30000 }).should('eq', '/dashboard')
  cy.contains('Restauration de votre session en cours...').should('not.exist')
  cy.contains('Bienvenue dans votre espace Supwarden.', { timeout: 30000 }).should('be.visible')
}

describe('Session', () => {
  it('redirige un visiteur vers la connexion depuis le tableau de bord', () => {
    cy.visit('/dashboard')

    cy.contains('Retrouvez vos trousseaux en quelques secondes.').should('be.visible')
    cy.location('pathname').should('eq', '/connexion')
  })

  it('redirige un visiteur vers la connexion depuis le profil', () => {
    cy.visit('/profil')

    cy.contains('Retrouvez vos trousseaux en quelques secondes.').should('be.visible')
    cy.location('pathname').should('eq', '/connexion')
  })

  it('redirige un utilisateur connecté depuis la connexion vers le tableau de bord', () => {
    registerUserThroughApi().then((session) => {
      visitWithSession('/connexion', session)
      waitForAuthenticatedRedirect()
    })
  })

  it("redirige un utilisateur connecté depuis l'inscription vers le tableau de bord", () => {
    registerUserThroughApi().then((session) => {
      visitWithSession('/inscription', session)
      waitForAuthenticatedRedirect()
    })
  })

  it('restaure la session après un rechargement de page', () => {
    registerUserThroughApi({ firstname: 'Camille', lastname: 'Durand' }).then((session) => {
      cy.intercept('GET', 'http://localhost:8000/api/me').as('meRequest')
      visitWithSession('/dashboard', session)
      cy.wait('@meRequest')

      cy.intercept('GET', 'http://localhost:8000/api/me').as('meReloadRequest')
      cy.reload()
      cy.wait('@meReloadRequest')

      cy.location('pathname', { timeout: 30000 }).should('eq', '/dashboard')
      cy.contains('Restauration de votre session en cours...').should('not.exist')
      cy.contains('Camille Durand', { timeout: 30000 }).should('be.visible')
    })
  })
})
