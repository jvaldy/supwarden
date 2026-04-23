import { registerUserThroughApi, visitWithSession } from '../helpers/session.js'

function visitVaultCreatePage(session) {
  cy.intercept('GET', 'http://localhost:8000/api/me').as('meRequest')
  visitWithSession('/vaults/nouveau', session)
  cy.wait('@meRequest')
  cy.contains('span', 'Nom du trousseau', { timeout: 30000 }).should('be.visible')
}

describe('Trousseaux', () => {
  it('couvre le cycle de vie principal d’un trousseau', () => {
    registerUserThroughApi({ firstname: 'Camille', lastname: 'Owner' }).then((ownerSession) => {
      registerUserThroughApi({ firstname: 'Louis', lastname: 'Member' }).then((memberSession) => {
        visitVaultCreatePage(ownerSession)

        cy.contains('span', 'Nom du trousseau').parent().find('input').type('Streaming famille')
        cy.contains('span', 'Description du trousseau').parent().find('textarea').type('Accès de la maison')
        cy.contains('button', 'Créer le trousseau').click()

        cy.location('pathname', { timeout: 30000 }).should('match', /^\/vaults\/\d+$/)
        cy.contains('h1', 'Streaming famille', { timeout: 30000 }).should('be.visible')
        cy.contains('Partagé').should('not.exist')

        cy.get('button[aria-label="Membres"]', { timeout: 30000 }).click()
        cy.contains('span', 'Adresse e-mail').parent().find('input').type(memberSession.email)
        cy.contains('span', 'Rôle').parent().find('select').select('Lecteur')
        cy.contains('button', 'Ajouter un membre').click()

        cy.contains('td', 'Louis Member', { timeout: 30000 }).should('exist')
        cy.contains('Partagé').should('be.visible')
        cy.contains('button', 'Fermer').click()

        cy.get('button[aria-label="Paramètres"]').click()
        cy.contains('span', 'Nom du trousseau').parent().find('input').clear().type('Streaming partagé')
        cy.contains('span', 'Description du trousseau').parent().find('textarea').clear().type('Accès partagés du foyer')
        cy.contains('button', 'Enregistrer').click()

        cy.contains('h1', 'Streaming partagé', { timeout: 30000 }).should('be.visible')
        cy.contains('Partagé').should('be.visible')

        cy.get('button[aria-label="Paramètres"]').click()
        cy.get('.vault-settings-modal', { timeout: 30000 })
          .contains('button', 'Supprimer le trousseau')
          .click({ force: true })
        cy.get('.modal-card', { timeout: 30000 })
          .last()
          .contains('button', 'Supprimer')
          .click({ force: true })

        cy.location('pathname', { timeout: 30000 }).should('eq', '/vaults')
        cy.contains('Streaming partagé').should('not.exist')
      })
    })
  })
})
