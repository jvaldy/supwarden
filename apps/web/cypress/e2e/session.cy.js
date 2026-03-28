import { registerUserThroughApi, visitWithSession } from '../helpers/session.js'

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

      cy.location('pathname').should('eq', '/dashboard')
      cy.contains('Bienvenue dans votre espace Supwarden.').should('be.visible')
    })
  })

  it('redirige un utilisateur connecté depuis l’inscription vers le tableau de bord', () => {
    registerUserThroughApi().then((session) => {
      visitWithSession('/inscription', session)

      cy.location('pathname').should('eq', '/dashboard')
      cy.contains('Bienvenue dans votre espace Supwarden.').should('be.visible')
    })
  })

  it('restaure la session après un rechargement de page', () => {
    registerUserThroughApi().then((session) => {
      visitWithSession('/dashboard', session)
      cy.reload()

      cy.location('pathname').should('eq', '/dashboard')
      cy.contains(session.user.email).should('be.visible')
    })
  })
})