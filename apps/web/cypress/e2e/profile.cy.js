import { registerUserThroughApi, visitWithSession } from '../helpers/session.js'

function visitProfilePage(session) {
  cy.intercept('GET', 'http://localhost:8000/api/me').as('meRequest')
  visitWithSession('/profil', session)
  cy.wait('@meRequest')
  cy.contains('h1', 'Gérez vos informations personnelles et votre sécurité.', { timeout: 30000 }).should('be.visible')
}

describe('Profil', () => {
  it('met à jour les informations personnelles', () => {
    registerUserThroughApi().then((session) => {
      visitProfilePage(session)
      cy.intercept('PATCH', 'http://localhost:8000/api/me').as('updateProfile')

      cy.contains('span', 'Prénom').parent().find('input').clear().type('Camille Anne')
      cy.contains('span', 'Nom').parent().find('input').clear().type('Durand Martin')
      cy.contains('button', 'Enregistrer mes informations').click()

      cy.wait('@updateProfile').its('response.statusCode').should('eq', 200)
      cy.contains('span', 'Prénom').parent().find('input').should('have.value', 'Camille Anne')
      cy.contains('span', 'Nom').parent().find('input').should('have.value', 'Durand Martin')
    })
  })

  it('modifie le mot de passe avec le mot de passe actuel', () => {
    registerUserThroughApi().then((session) => {
      visitProfilePage(session)
      cy.intercept('PATCH', 'http://localhost:8000/api/me').as('updatePassword')

      cy.contains('span', 'Mot de passe actuel').parent().find('input').first().type('motdepasse123')
      cy.contains('span', 'Nouveau mot de passe').parent().find('input').type('motdepasse12345')
      cy.contains('span', 'Confirmer le nouveau mot de passe').parent().find('input').type('motdepasse12345')
      cy.contains('button', 'Modifier mon mot de passe').click()

      cy.wait('@updatePassword').its('response.statusCode').should('eq', 200)
    })
  })

  it('refuse le changement de mot de passe sans mot de passe actuel', () => {
    registerUserThroughApi().then((session) => {
      visitProfilePage(session)
      cy.intercept('PATCH', 'http://localhost:8000/api/me').as('updatePassword')

      cy.contains('span', 'Nouveau mot de passe').parent().find('input').type('motdepasse12345')
      cy.contains('span', 'Confirmer le nouveau mot de passe').parent().find('input').type('motdepasse12345')
      cy.contains('button', 'Modifier mon mot de passe').click()

      cy.wait('@updatePassword').its('response.statusCode').should('eq', 422)
      cy.contains('Le mot de passe actuel est obligatoire.', { timeout: 30000 }).should('be.visible')
    })
  })

  it('refuse le changement si la confirmation ne correspond pas', () => {
    registerUserThroughApi().then((session) => {
      visitProfilePage(session)

      cy.contains('span', 'Mot de passe actuel').parent().find('input').first().type('motdepasse123')
      cy.contains('span', 'Nouveau mot de passe').parent().find('input').type('motdepasse12345')
      cy.contains('span', 'Confirmer le nouveau mot de passe').parent().find('input').type('different')
      cy.contains('button', 'Modifier mon mot de passe').click()

      cy.contains('Les nouveaux mots de passe doivent être identiques.').should('be.visible')
    })
  })

  it('définit puis redéfinit le code PIN en demandant ensuite le mot de passe actuel du compte', () => {
    registerUserThroughApi().then((session) => {
      visitProfilePage(session)
      cy.intercept('PATCH', 'http://localhost:8000/api/me').as('updatePin')

      cy.contains('span', 'Nouveau code PIN').parent().find('input').type('1234')
      cy.contains('span', 'Confirmer le nouveau code PIN').parent().find('input').type('1234')
      cy.contains('button', 'Définir un code PIN').click()

      cy.wait('@updatePin').its('response.statusCode').should('eq', 200)
      cy.contains('button', 'Modifier mon code PIN', { timeout: 30000 }).should('be.visible')

      cy.intercept('PATCH', 'http://localhost:8000/api/me').as('updatePinAgain')
      cy.contains('span', 'Mot de passe actuel du compte').parent().find('input').type('motdepasse123')
      cy.contains('span', 'Nouveau code PIN').parent().find('input').clear().type('5678')
      cy.contains('span', 'Confirmer le nouveau code PIN').parent().find('input').clear().type('5678')
      cy.contains('button', 'Modifier mon code PIN').click()

      cy.wait('@updatePinAgain').its('response.statusCode').should('eq', 200)
    })
  })

  it('refuse la modification du code PIN si la confirmation ne correspond pas', () => {
    registerUserThroughApi().then((session) => {
      visitProfilePage(session)

      cy.contains('span', 'Nouveau code PIN').parent().find('input').type('1234')
      cy.contains('span', 'Confirmer le nouveau code PIN').parent().find('input').type('4321')
      cy.contains('button', 'Définir un code PIN').click()

      cy.contains('Les codes PIN doivent être identiques.').should('be.visible')
    })
  })

  it('refuse la suppression sans confirmation explicite', () => {
    registerUserThroughApi().then((session) => {
      visitProfilePage(session)

      cy.contains('h2', 'Supprimer mon compte')
        .parents('.profile-section')
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
      visitProfilePage(session)
      cy.intercept('DELETE', 'http://localhost:8000/api/me').as('deleteAccount')

      cy.contains('h2', 'Supprimer mon compte')
        .parents('.profile-section')
        .within(() => {
          cy.contains('span', 'Mot de passe actuel').parent().find('input').type('motdepasse123')
          cy.get('input[type="checkbox"]').check()
          cy.contains('button', 'Supprimer mon compte').click()
        })

      cy.wait('@deleteAccount').its('response.statusCode').should('eq', 200)
      cy.location('pathname', { timeout: 30000 }).should('eq', '/')
      cy.contains('Simplifiez le partage des accès dans votre équipe.').should('be.visible')
    })
  })
})
