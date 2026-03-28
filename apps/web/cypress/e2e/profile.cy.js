import { registerUserThroughApi, visitWithSession, uniqueEmail } from '../helpers/session.js'

describe('Profil', () => {
  it('met à jour les informations personnelles et l’adresse e-mail', () => {
    const updatedEmail = uniqueEmail('profil')

    registerUserThroughApi().then((session) => {
      visitWithSession('/profil', session)

      cy.contains('span', 'Prénom').parent().find('input').clear().type('Camille Anne')
      cy.contains('span', 'Nom').parent().find('input').clear().type('Durand Martin')
      cy.contains('span', 'Adresse e-mail').parent().find('input').clear().type(updatedEmail)
      cy.contains('button', 'Enregistrer mes informations').click()

      cy.contains('Vos informations ont bien été mises à jour.').should('be.visible')
      cy.contains(updatedEmail).should('be.visible')
    })
  })

  it('modifie le mot de passe avec le mot de passe actuel', () => {
    registerUserThroughApi().then((session) => {
      visitWithSession('/profil', session)

      cy.contains('span', 'Mot de passe actuel').parent().find('input').first().type('motdepasse123')
      cy.contains('span', 'Nouveau mot de passe').parent().find('input').type('motdepasse12345')
      cy.contains('button', 'Modifier mon mot de passe').click()

      cy.contains('Votre mot de passe a bien été modifié.').should('be.visible')
    })
  })

  it('refuse le changement de mot de passe sans mot de passe actuel', () => {
    registerUserThroughApi().then((session) => {
      visitWithSession('/profil', session)

      cy.contains('span', 'Nouveau mot de passe').parent().find('input').type('motdepasse12345')
      cy.contains('button', 'Modifier mon mot de passe').click()

      cy.contains('Le mot de passe actuel est obligatoire.').should('be.visible')
    })
  })

  it('refuse la suppression sans confirmation explicite', () => {
    registerUserThroughApi().then((session) => {
      visitWithSession('/profil', session)

      cy.contains('h2', 'Supprimer mon compte')
        .parent()
        .parent()
        .within(() => {
          cy.contains('span', 'Mot de passe actuel').parent().find('input').type('motdepasse123')
          cy.contains('button', 'Supprimer mon compte').click()
        })

      cy.contains('Veuillez confirmer la suppression de votre compte.').should('be.visible')
    })
  })

  it('supprime le compte après confirmation', () => {
    cy.on('window:confirm', () => true)

    registerUserThroughApi().then((session) => {
      visitWithSession('/profil', session)

      cy.contains('h2', 'Supprimer mon compte')
        .parent()
        .parent()
        .within(() => {
          cy.contains('span', 'Mot de passe actuel').parent().find('input').type('motdepasse123')
          cy.get('input[type="checkbox"]').check()
          cy.contains('button', 'Supprimer mon compte').click()
        })

      cy.location('pathname').should('eq', '/')
      cy.contains('Simplifiez le partage des accès dans votre équipe.').should('be.visible')
    })
  })
})