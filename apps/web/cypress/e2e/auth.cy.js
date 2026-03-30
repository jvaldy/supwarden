import { registerUserThroughApi, uniqueEmail } from '../helpers/session.js'

describe('Authentification', () => {
  it('connecte un utilisateur existant et ouvre le tableau de bord', () => {
    registerUserThroughApi().then(({ email, password }) => {
      cy.visit('/connexion')
      cy.get('input[type="email"]').type(email)
      cy.get('input[type="password"]').type(password)
      cy.contains('button', 'Se connecter').click()

      cy.location('pathname').should('eq', '/dashboard')
      cy.contains('Bienvenue dans votre espace Supwarden.').should('be.visible')
      cy.contains(email).should('be.visible')
    })
  })

  it('affiche un message clair si les identifiants sont invalides', () => {
    cy.visit('/connexion')
    cy.get('input[type="email"]').type('inconnu@example.com')
    cy.get('input[type="password"]').type('motdepasse-invalide')
    cy.contains('button', 'Se connecter').click()

    cy.contains('Identifiants invalides.').should('be.visible')
    cy.location('pathname').should('eq', '/connexion')
  })

  it('inscrit un nouvel utilisateur puis ouvre le tableau de bord', () => {
    const email = uniqueEmail('inscription')

    cy.visit('/inscription')
    cy.get('input[type="text"]').eq(0).type('Camille')
    cy.get('input[type="text"]').eq(1).type('Durand')
    cy.get('input[type="email"]').type(email)
    cy.get('input[autocomplete="new-password"]').eq(0).type('motdepasse123')
    cy.get('input[autocomplete="new-password"]').eq(1).type('motdepasse123')
    cy.contains('button', 'Créer mon compte').click()

    cy.location('pathname').should('eq', '/dashboard')
    cy.contains(email).should('be.visible')
  })

  it("bloque l'inscription si la confirmation du mot de passe ne correspond pas", () => {
    cy.visit('/inscription')
    cy.get('input[autocomplete="new-password"]').eq(0).type('motdepasse123')
    cy.get('input[autocomplete="new-password"]').eq(1).type('motdepasse-different')
    cy.contains('button', 'Créer mon compte').click()

    cy.contains('Les mots de passe doivent être identiques.').should('be.visible')
  })

  it("refuse l'inscription si l'adresse e-mail existe déjà", () => {
    const email = uniqueEmail('doublon')

    registerUserThroughApi({ email }).then(() => {
      cy.visit('/inscription')
      cy.get('input[type="text"]').eq(0).type('Camille')
      cy.get('input[type="text"]').eq(1).type('Durand')
      cy.get('input[type="email"]').type(email)
      cy.get('input[autocomplete="new-password"]').eq(0).type('motdepasse123')
      cy.get('input[autocomplete="new-password"]').eq(1).type('motdepasse123')
      cy.contains('button', 'Créer mon compte').click()

      cy.contains('Cette adresse e-mail est déjà utilisée.').should('be.visible')
    })
  })
})
