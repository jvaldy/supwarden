import { registerUserThroughApi, visitWithSession } from '../helpers/session.js'

const apiBaseUrl = 'http://localhost:8000'
const e2eHeaders = {
  'Content-Type': 'application/json',
  'X-E2E-Test': '1',
}

function createVault(session, { name, description = '' }) {
  return cy
    .request({
      method: 'POST',
      url: `${apiBaseUrl}/api/vaults`,
      headers: {
        ...e2eHeaders,
        Authorization: `Bearer ${session.token}`,
      },
      body: {
        name,
        description,
      },
    })
    .then(({ body }) => body.vault)
}

function createItem(session, vaultId, overrides = {}) {
  return cy
    .request({
      method: 'POST',
      url: `${apiBaseUrl}/api/vaults/${vaultId}/items`,
      headers: {
        ...e2eHeaders,
        Authorization: `Bearer ${session.token}`,
      },
      body: {
        name: 'Netflix famille',
        username: 'camille@example.com',
        secret: 'snapshot-test-secret',
        notes: 'Acces principal du foyer.',
        type: 'LOGIN',
        isSensitive: false,
        uris: [
          {
            label: 'Connexion',
            uri: 'https://www.netflix.com/login',
          },
        ],
        customFields: [
          {
            label: 'Profil',
            value: 'Salon',
            type: 'text',
            isSensitive: false,
          },
        ],
        ...overrides,
      },
    })
    .then(({ body }) => body.item)
}

function sendPrivateMessage(senderSession, recipientUserId, content) {
  return cy.request({
    method: 'POST',
    url: `${apiBaseUrl}/api/messages/private/${recipientUserId}`,
    headers: {
      ...e2eHeaders,
      Authorization: `Bearer ${senderSession.token}`,
    },
    body: {
      content,
    },
  })
}

function waitForAuthenticatedPage(path, session, text) {
  cy.intercept('GET', `${apiBaseUrl}/api/me`).as(`me-${path.replace(/[^\w]/g, '-')}`)
  visitWithSession(path, session)
  cy.wait(`@me-${path.replace(/[^\w]/g, '-')}`)
  cy.contains(text, { timeout: 30000 }).should('be.visible')
}

function takePageScreenshot(name) {
  cy.screenshot(name, {
    capture: 'fullPage',
    overwrite: true,
  })
}

describe('Captures UI du projet', () => {
  beforeEach(() => {
    cy.viewport(1600, 1200)
  })

  it('genere des captures PNG des principales pages publiques et privees', () => {
    registerUserThroughApi({ firstname: 'Camille', lastname: 'Owner' }).then((ownerSession) => {
      registerUserThroughApi({ firstname: 'Louis', lastname: 'Contact' }).then((contactSession) => {
        createVault(ownerSession, {
          name: 'Streaming famille',
          description: 'Acces partages du foyer',
        }).then((vault) => {
          createItem(ownerSession, vault.id).then((item) => {
            sendPrivateMessage(contactSession, ownerSession.user.id, 'Bonjour depuis la conversation privee.')

            cy.visit('/connexion')
            cy.contains('Se connecter', { timeout: 30000 }).should('be.visible')
            takePageScreenshot('ui/login-page')

            cy.visit('/inscription')
            cy.contains("S'inscrire", { timeout: 30000 }).should('be.visible')
            takePageScreenshot('ui/register-page')

            cy.visit('/en-savoir-plus')
            cy.contains('Ouvrir le dashboard', { timeout: 30000 }).should('be.visible')
            takePageScreenshot('ui/marketing-page')

            cy.visit('/brand')
            cy.contains('Primary', { timeout: 30000 }).should('be.visible')
            takePageScreenshot('ui/brand-page')

            waitForAuthenticatedPage('/dashboard', ownerSession, 'Bienvenue dans votre espace Supwarden.')
            takePageScreenshot('ui/dashboard-page')

            waitForAuthenticatedPage('/vaults', ownerSession, 'Créer un trousseau')
            cy.contains('Streaming famille', { timeout: 30000 }).should('be.visible')
            takePageScreenshot('ui/vault-list-page')

            waitForAuthenticatedPage('/vaults/nouveau', ownerSession, 'Créer le trousseau')
            takePageScreenshot('ui/vault-create-page')

            waitForAuthenticatedPage(`/vaults/${vault.id}`, ownerSession, 'Streaming famille')
            takePageScreenshot('ui/vault-detail-page')

            waitForAuthenticatedPage(`/vaults/${vault.id}/items/nouveau`, ownerSession, 'Créer l’élément')
            takePageScreenshot('ui/item-create-page')

            waitForAuthenticatedPage(`/vaults/${vault.id}/items/${item.id}`, ownerSession, 'Détail')
            takePageScreenshot('ui/item-detail-page')

            waitForAuthenticatedPage(`/vaults/${vault.id}/items/${item.id}/modifier`, ownerSession, 'Enregistrer les modifications')
            takePageScreenshot('ui/item-edit-page')

            waitForAuthenticatedPage('/profil', ownerSession, 'Enregistrer mes informations')
            takePageScreenshot('ui/profile-page')

            waitForAuthenticatedPage('/messages', ownerSession, 'Choisissez une conversation')
            cy.contains('Bonjour depuis la conversation privee.', { timeout: 30000 }).should('be.visible')
            takePageScreenshot('ui/messages-page')
          })
        })
      })
    })
  })
})
