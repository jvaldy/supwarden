import { registerUserThroughApi, visitWithSession } from '../helpers/session.js'

describe('Trousseaux', () => {
  it('couvre le cycle de vie principal d’un trousseau', () => {
    cy.on('window:confirm', () => true)

    registerUserThroughApi({
      firstname: 'Camille',
      lastname: 'Owner',
    }).then((ownerSession) => {
      registerUserThroughApi({
        firstname: 'Louis',
        lastname: 'Member',
      }).then((memberSession) => {
        visitWithSession('/vaults/nouveau', ownerSession)

        cy.contains('span', 'Nom du trousseau').parent().find('input').type('Streaming famille')
        cy.contains('span', 'Description du trousseau').parent().find('textarea').type('Accès de la maison')
        cy.contains('button', 'Créer le trousseau').click()

        cy.location('pathname').should('match', /^\/vaults\/\d+$/)
        cy.contains('h1', 'Streaming famille').should('be.visible')
        cy.contains('Type : Personnel').should('be.visible')

        cy.contains('button', 'Membres').click()
        cy.contains('span', 'Adresse e-mail').parent().find('input').type(memberSession.email)
        cy.contains('span', 'Rôle').parent().find('select').select('Lecteur')
        cy.contains('button', 'Ajouter un membre').click()

        cy.contains('Invitation enregistrée. Le membre apparaît maintenant dans la liste.').should('be.visible')
        cy.contains('Louis Member').should('be.visible')
        cy.contains('Type : Partagé').should('be.visible')

        cy.contains('tr', 'Louis Member').within(() => {
          cy.get('select').select('Éditeur')
        })

        cy.contains('Le rôle du membre a bien été mis à jour.').should('be.visible')

        cy.contains('button', 'Fermer').click()
        cy.contains('button', 'Paramètres').click()

        cy.contains('span', 'Nom du trousseau').parent().find('input').clear().type('Streaming partagé')
        cy.contains('span', 'Description du trousseau').parent().find('textarea').clear().type('Accès partagés du foyer')
        cy.contains('button', 'Enregistrer').click()

        cy.contains('Les paramètres du trousseau ont bien été mis à jour.').should('be.visible')
        cy.contains('h1', 'Streaming partagé').should('be.visible')

        cy.contains('button', 'Membres').click()

        cy.contains('tr', 'Louis Member').within(() => {
          cy.contains('button', 'Retirer').click()
        })

        cy.contains('Le membre a bien été retiré du trousseau.').should('be.visible')
        cy.contains('Type : Personnel').should('be.visible')
        cy.contains('Louis Member').should('not.exist')

        cy.contains('button', 'Fermer').click()
        cy.contains('button', 'Paramètres').click()
        cy.contains('button', 'Supprimer le trousseau').click()

        cy.location('pathname').should('eq', '/vaults')
        cy.contains('Aucun trousseau pour le moment').should('be.visible')
      })
    })
  })
})
