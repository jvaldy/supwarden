import { registerUserThroughApi, visitWithSession } from '../helpers/session.js'

function visitVaultCreatePage(session) {
  cy.intercept('GET', 'http://localhost:8000/api/me').as('meRequest')
  visitWithSession('/vaults/nouveau', session)
  cy.wait('@meRequest')
  cy.contains('span', 'Nom du trousseau', { timeout: 30000 }).should('be.visible')
}

describe('Trousseaux', () => {
  it('couvre le cycle de vie principal d’un trousseau', () => {
    cy.on('window:confirm', () => true)

    registerUserThroughApi({ firstname: 'Camille', lastname: 'Owner' }).then((ownerSession) => {
      registerUserThroughApi({ firstname: 'Louis', lastname: 'Member' }).then((memberSession) => {
        visitVaultCreatePage(ownerSession)

        cy.contains('span', 'Nom du trousseau').parent().find('input').type('Streaming famille')
        cy.contains('span', 'Description du trousseau').parent().find('textarea').type('Accès de la maison')
        cy.contains('button', 'Créer le trousseau').click()

        cy.location('pathname', { timeout: 30000 }).should('match', /^\/vaults\/\d+$/)
        cy.contains('h1', 'Streaming famille', { timeout: 30000 }).should('be.visible')
        cy.contains('Personnel').should('be.visible')

        cy.contains('button', 'Membres').click()
        cy.contains('span', 'Adresse e-mail').parent().find('input').type(memberSession.email)
        cy.contains('span', 'Rôle').parent().find('select').select('Lecteur')
        cy.contains('button', 'Ajouter un membre').click()

        cy.contains('td', memberSession.email, { timeout: 30000 }).should('exist')
        cy.contains('Partagé').should('be.visible')
        cy.contains('button', 'Fermer').click()

        cy.contains('button', 'Paramètres').click()
        cy.contains('span', 'Nom du trousseau').parent().find('input').clear().type('Streaming partagé')
        cy.contains('span', 'Description du trousseau').parent().find('textarea').clear().type('Accès partagés du foyer')
        cy.contains('button', 'Enregistrer').click()

        cy.contains('h1', 'Streaming partagé', { timeout: 30000 }).should('be.visible')
        cy.contains('Accès partagés du foyer').should('be.visible')
        cy.contains('Partagé').should('be.visible')

        cy.contains('button', 'Paramètres').click()
        cy.contains('button', 'Supprimer le trousseau').click()

        cy.location('pathname', { timeout: 30000 }).should('eq', '/vaults')
        cy.contains('Aucun trousseau pour le moment').should('be.visible')
      })
    })
  })
})
