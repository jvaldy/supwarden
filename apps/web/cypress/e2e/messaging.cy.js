import { loginUserThroughApi, registerUserThroughApi, visitWithSession } from '../helpers/session.js'

const apiBaseUrl = 'http://localhost:8000'

describe('Messagerie et notifications', () => {
  it('affiche les non lus prives et les marque comme lus apres ouverture de la conversation', () => {
    registerUserThroughApi({ firstname: 'Alice', lastname: 'Owner' }).then((ownerSession) => {
      registerUserThroughApi({ firstname: 'Bob', lastname: 'Sender' }).then((senderSession) => {
        cy.request({
          method: 'POST',
          url: `${apiBaseUrl}/api/messages/private/${ownerSession.user.id}`,
          headers: {
            Authorization: `Bearer ${senderSession.token}`,
            'Content-Type': 'application/json',
            'X-E2E-Test': '1',
          },
          body: {
            content: 'Message prive E2E',
          },
        })

        visitWithSession('/messages', ownerSession)
        cy.contains('Choisissez une conversation', { timeout: 30000 }).should('be.visible')
        cy.contains('Message prive E2E', { timeout: 30000 }).should('be.visible')
      })
    })
  })

  it('affiche les messages de discussion de trousseau pour un membre', () => {
    registerUserThroughApi({ firstname: 'Carla', lastname: 'Owner' }).then((ownerSession) => {
      registerUserThroughApi({ firstname: 'David', lastname: 'Member' }).then((memberSession) => {
        cy.request({
          method: 'POST',
          url: `${apiBaseUrl}/api/vaults`,
          headers: {
            Authorization: `Bearer ${ownerSession.token}`,
            'Content-Type': 'application/json',
            'X-E2E-Test': '1',
          },
          body: {
            name: 'Vault E2E Chat',
            description: 'Messagerie de groupe',
          },
        }).then(({ body }) => {
          const vaultId = body.vault.id

          cy.request({
            method: 'POST',
            url: `${apiBaseUrl}/api/vaults/${vaultId}/members`,
            headers: {
              Authorization: `Bearer ${ownerSession.token}`,
              'Content-Type': 'application/json',
              'X-E2E-Test': '1',
            },
            body: {
              email: memberSession.email,
              role: 'VIEWER',
            },
          })

          loginUserThroughApi({ email: memberSession.email, password: memberSession.password }).then((freshMemberSession) => {
            cy.request({
              method: 'POST',
              url: `${apiBaseUrl}/api/vaults/${vaultId}/messages`,
              headers: {
                Authorization: `Bearer ${freshMemberSession.token}`,
                'Content-Type': 'application/json',
                'X-E2E-Test': '1',
              },
              body: {
                content: 'Message groupe E2E',
              },
            })

            visitWithSession(`/vaults/${vaultId}`, ownerSession)
            cy.get('button[aria-label="Discussion"]', { timeout: 30000 }).click()
            cy.contains('Discussion du trousseau').should('be.visible')
            cy.contains('Message groupe E2E', { timeout: 30000 }).should('be.visible')
          })
        })
      })
    })
  })
})