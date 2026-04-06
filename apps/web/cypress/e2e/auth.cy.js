import { registerUserThroughApi, uniqueEmail } from '../helpers/session.js'

describe('Authentification', () => {
  it('connecte un utilisateur existant et ouvre le tableau de bord', () => {
    registerUserThroughApi().then((session) => {
      cy.intercept('POST', 'http://localhost:8000/api/auth/login').as('loginRequest')
      cy.intercept('GET', 'http://localhost:8000/api/me').as('meRequest')

      cy.visit('/connexion')
      cy.get('input[type="email"]').type(session.email)
      cy.get('input[type="password"]').type(session.password)
      cy.contains('button', 'Se connecter').click()

      cy.wait('@loginRequest')
      cy.location('pathname', { timeout: 30000 }).should('eq', '/dashboard')
      cy.wait('@meRequest')
      cy.contains('Restauration de votre session en cours...').should('not.exist')
      cy.contains('Bienvenue dans votre espace Supwarden.', { timeout: 30000 }).should('be.visible')
      cy.contains(`${session.user.firstname} ${session.user.lastname}`.trim()).should('be.visible')
    })
  })

  it('affiche un message clair si les identifiants sont invalides', () => {
    cy.intercept('POST', 'http://localhost:8000/api/auth/login').as('loginRequest')

    cy.visit('/connexion')
    cy.get('input[type="email"]').type('inconnu@example.com')
    cy.get('input[type="password"]').type('motdepasse-invalide')
    cy.contains('button', 'Se connecter').click()

    cy.wait('@loginRequest')
    cy.contains('Identifiants invalides.', { timeout: 15000 }).should('be.visible')
    cy.location('pathname').should('eq', '/connexion')
  })

  it('inscrit un nouvel utilisateur puis ouvre le tableau de bord', () => {
    const email = uniqueEmail('inscription')

    cy.intercept('POST', 'http://localhost:8000/api/auth/register').as('registerRequest')
    cy.intercept('GET', 'http://localhost:8000/api/me').as('meRequest')

    cy.visit('/inscription')
    cy.get('input[type="text"]').eq(0).type('Camille')
    cy.get('input[type="text"]').eq(1).type('Durand')
    cy.get('input[type="email"]').type(email)
    cy.get('input[autocomplete="new-password"]').eq(0).type('motdepasse123')
    cy.get('input[autocomplete="new-password"]').eq(1).type('motdepasse123')
    cy.contains('button', 'Créer mon compte').click()

    cy.wait('@registerRequest')
    cy.location('pathname', { timeout: 30000 }).should('eq', '/dashboard')
    cy.wait('@meRequest')
    cy.contains('Restauration de votre session en cours...').should('not.exist')
    cy.contains('Bienvenue dans votre espace Supwarden.', { timeout: 30000 }).should('be.visible')
    cy.contains('Camille Durand').should('be.visible')
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
      cy.intercept('POST', 'http://localhost:8000/api/auth/register').as('registerRequest')

      cy.visit('/inscription')
      cy.get('input[type="text"]').eq(0).type('Camille')
      cy.get('input[type="text"]').eq(1).type('Durand')
      cy.get('input[type="email"]').type(email)
      cy.get('input[autocomplete="new-password"]').eq(0).type('motdepasse123')
      cy.get('input[autocomplete="new-password"]').eq(1).type('motdepasse123')
      cy.contains('button', 'Créer mon compte').click()

      cy.wait('@registerRequest')
      cy.contains('Cette adresse e-mail est déjà utilisée.').should('be.visible')
    })
  })
})
