import { registerUserThroughApi, visitWithSession } from '../helpers/session.js'

function visitVaultCreatePage(session) {
  cy.intercept('GET', 'http://localhost:8000/api/me').as('meRequest')
  visitWithSession('/vaults/nouveau', session)
  cy.wait('@meRequest')
  cy.contains('span', 'Nom du trousseau', { timeout: 30000 }).should('be.visible')
}

describe('Items', () => {
  it('couvre le cycle de vie principal d’un item dans un trousseau', () => {
    cy.on('window:confirm', () => true)

    registerUserThroughApi({ firstname: 'Camille', lastname: 'Owner' }).then((ownerSession) => {
      registerUserThroughApi({ firstname: 'Louis', lastname: 'Editor' }).then((editorSession) => {
        visitVaultCreatePage(ownerSession)

        cy.contains('span', 'Nom du trousseau').parent().find('input').type('Streaming')
        cy.contains('button', 'Créer le trousseau').click()

        cy.location('pathname', { timeout: 30000 }).should('match', /^\/vaults\/\d+$/)
        cy.contains('button', 'Ajouter un élément', { timeout: 30000 }).click()

        cy.contains('span', 'Nom de l’élément').parent().find('input').type('Netflix')
        cy.contains('span', 'Nom d’utilisateur').parent().find('input').type('camille@example.com')
        cy.contains('span', 'Mot de passe').parent().find('input').first().type('motdepasse123')
        cy.contains('span', 'Notes').parent().find('textarea').type('Compte foyer')
        cy.contains('span', 'Demander un code PIN avant d’afficher le secret').parent().find('input[type="checkbox"]').uncheck({ force: true })
        cy.get('input[placeholder="Ex. Connexion"]').type('Netflix')
        cy.get('input[placeholder="https://exemple.com"]').first().type('https://www.netflix.com/login')
        cy.contains('button', 'Ajouter un champ').click()
        cy.get('input[placeholder="Ex. Profil"]').last().type('Profil')
        cy.get('input[placeholder="Ex. Famille"]').last().type('Famille')
        cy.contains('button', 'Créer l’élément').click()

        cy.location('pathname', { timeout: 30000 }).should('match', /^\/vaults\/\d+$/)
        cy.contains('strong', 'Netflix', { timeout: 30000 }).should('be.visible')
        cy.contains('button', 'Plus').click()
        cy.contains('Netflix').should('be.visible')
        cy.contains('camille@example.com').should('be.visible')
        cy.contains('button', 'Fermer').click()

        cy.contains('button', 'Membres').click()
        cy.contains('span', 'Adresse e-mail').parent().find('input').type(editorSession.email)
        cy.contains('span', 'Rôle').parent().find('select').select('Éditeur')
        cy.contains('button', 'Ajouter un membre').click()
        cy.contains('Partagé', { timeout: 30000 }).should('be.visible')
        cy.contains('td', editorSession.email, { timeout: 30000 }).should('exist')
      })
    })
  })
})
