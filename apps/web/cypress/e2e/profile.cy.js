import { registerUserThroughApi, visitWithSession } from '../helpers/session.js'

describe('Profil', () => {
  it('met à jour les informations personnelles', () => {
    registerUserThroughApi().then((session) => {
      visitWithSession('/profil', session)

      cy.contains('span', 'Prénom').parent().find('input').clear().type('Camille Anne')
      cy.contains('span', 'Nom').parent().find('input').clear().type('Durand Martin')
      cy.contains('button', 'Enregistrer mes informations').click()

      cy.contains('Vos informations ont bien été mises à jour.').should('be.visible')
      cy.contains('Camille Anne').should('exist')
    })
  })

  it('modifie le mot de passe avec le mot de passe actuel', () => {
    registerUserThroughApi().then((session) => {
      visitWithSession('/profil', session)

      cy.contains('span', 'Mot de passe actuel').parent().find('input').first().type('motdepasse123')
      cy.contains('span', 'Nouveau mot de passe').parent().find('input').type('motdepasse12345')
      cy.contains('span', 'Confirmer le nouveau mot de passe').parent().find('input').type('motdepasse12345')
      cy.contains('button', 'Modifier mon mot de passe').click()

      cy.contains('Votre mot de passe a bien été modifié.').should('be.visible')
    })
  })

  it('refuse le changement de mot de passe sans mot de passe actuel', () => {
    registerUserThroughApi().then((session) => {
      visitWithSession('/profil', session)

      cy.contains('span', 'Nouveau mot de passe').parent().find('input').type('motdepasse12345')
      cy.contains('span', 'Confirmer le nouveau mot de passe').parent().find('input').type('motdepasse12345')
      cy.contains('button', 'Modifier mon mot de passe').click()

      cy.contains('Le mot de passe actuel est obligatoire.').should('be.visible')
    })
  })

  it('refuse le changement si la confirmation ne correspond pas', () => {
    registerUserThroughApi().then((session) => {
      visitWithSession('/profil', session)

      cy.contains('span', 'Mot de passe actuel').parent().find('input').first().type('motdepasse123')
      cy.contains('span', 'Nouveau mot de passe').parent().find('input').type('motdepasse12345')
      cy.contains('span', 'Confirmer le nouveau mot de passe').parent().find('input').type('different')
      cy.contains('button', 'Modifier mon mot de passe').click()

      cy.contains('Les nouveaux mots de passe doivent être identiques.').should('be.visible')
    })
  })

  it('définit puis redéfinit le code PIN sans demander l’ancien code', () => {
    registerUserThroughApi().then((session) => {
      visitWithSession('/profil', session)

      cy.contains('span', 'Nouveau code PIN').parent().find('input').type('1234')
      cy.contains('span', 'Confirmer le nouveau code PIN').parent().find('input').type('1234')
      cy.contains('button', 'Définir un code PIN').click()

      cy.contains('Votre code PIN a bien été défini.').should('be.visible')
      cy.contains('span', 'Code PIN actuel').should('not.exist')

      cy.contains('span', 'Nouveau code PIN').parent().find('input').type('5678')
      cy.contains('span', 'Confirmer le nouveau code PIN').parent().find('input').type('5678')
      cy.contains('button', 'Modifier mon code PIN').click()

      cy.contains('Votre code PIN a bien été modifié.').should('be.visible')
      cy.contains('span', 'Code PIN actuel').should('not.exist')
    })
  })

  it('refuse la modification du code PIN si la confirmation ne correspond pas', () => {
    registerUserThroughApi().then((session) => {
      visitWithSession('/profil', session)

      cy.contains('span', 'Nouveau code PIN').parent().find('input').type('1234')
      cy.contains('span', 'Confirmer le nouveau code PIN').parent().find('input').type('4321')
      cy.contains('button', 'Définir un code PIN').click()

      cy.contains('Les codes PIN doivent être identiques.').should('be.visible')
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
      cy.contains("Simplifiez le partage des accès dans votre équipe.").should('be.visible')
    })
  })
})
