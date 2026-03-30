import { registerUserThroughApi, visitWithSession } from '../helpers/session.js'

describe('Navigation connectée', () => {
  it('ouvre et referme le menu Mon compte', () => {
    registerUserThroughApi().then((session) => {
      visitWithSession('/dashboard', session)

      cy.contains('button', 'Mon compte').click()
      cy.contains('button', 'Profil').should('be.visible')
      cy.get('body').click(0, 0)
      cy.contains('button', 'Profil').should('not.exist')
    })
  })

  it('ouvre la page profil depuis le menu Mon compte', () => {
    registerUserThroughApi().then((session) => {
      visitWithSession('/dashboard', session)

      cy.contains('button', 'Mon compte').click()
      cy.contains('button', 'Profil').click()

      cy.location('pathname').should('eq', '/profil')
      cy.contains('Gérez vos informations personnelles et votre sécurité.').should('be.visible')
    })
  })

  it("déconnecte l'utilisateur depuis le menu Mon compte", () => {
    registerUserThroughApi().then((session) => {
      visitWithSession('/dashboard', session)

      cy.contains('button', 'Mon compte').click()
      cy.contains('button', 'Se déconnecter').click()

      cy.location('pathname').should('eq', '/')
      cy.contains("Simplifiez le partage des accès dans votre équipe.").should('be.visible')
    })
  })
})
