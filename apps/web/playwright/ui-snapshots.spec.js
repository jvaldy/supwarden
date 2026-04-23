import fs from 'fs/promises'
import path from 'path'
import { test, expect } from '@playwright/test'

const apiBaseUrl = 'http://localhost:8000'
const screenshotDir = path.resolve(process.cwd(), 'playwright', 'screenshots')
const sessionStorageKey = 'supwarden.session'
const e2eHeaders = {
  'Content-Type': 'application/json',
  'X-E2E-Test': '1',
}

function uniqueEmail(prefix = 'playwright') {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 100000)}@example.com`
}

function createTinyPngBuffer() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9p8nX6sAAAAASUVORK5CYII=',
    'base64',
  )
}

async function ensureScreenshotDir() {
  await fs.mkdir(screenshotDir, { recursive: true })
}

async function registerUser(request, {
  email = uniqueEmail(),
  password = 'snapshot-test-secret',
  firstname = 'Camille',
  lastname = 'Durand',
} = {}) {
  const response = await request.post(`${apiBaseUrl}/api/auth/register`, {
    headers: e2eHeaders,
    data: {
      email,
      password,
      firstname,
      lastname,
    },
  })

  expect(response.ok()).toBeTruthy()
  const body = await response.json()

  return {
    email,
    password,
    token: body.token,
    user: body.user,
  }
}

async function createVault(request, session, { name, description = '' }) {
  const response = await request.post(`${apiBaseUrl}/api/vaults`, {
    headers: {
      ...e2eHeaders,
      Authorization: `Bearer ${session.token}`,
    },
    data: {
      name,
      description,
    },
  })

  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  return body.vault
}

async function createItem(request, session, vaultId, overrides = {}) {
  const response = await request.post(`${apiBaseUrl}/api/vaults/${vaultId}/items`, {
    headers: {
      ...e2eHeaders,
      Authorization: `Bearer ${session.token}`,
    },
    data: {
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

  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  return body.item
}

async function addVaultMember(request, session, vaultId, { email, role = 'VIEWER' }) {
  const response = await request.post(`${apiBaseUrl}/api/vaults/${vaultId}/members`, {
    headers: {
      ...e2eHeaders,
      Authorization: `Bearer ${session.token}`,
    },
    data: {
      email,
      role,
    },
  })

  expect(response.ok()).toBeTruthy()
}

async function sendVaultMessage(request, session, vaultId, content) {
  const response = await request.post(`${apiBaseUrl}/api/vaults/${vaultId}/messages`, {
    headers: {
      ...e2eHeaders,
      Authorization: `Bearer ${session.token}`,
    },
    data: {
      content,
    },
  })

  expect(response.ok()).toBeTruthy()
}

async function sendPrivateMessage(request, senderSession, recipientUserId, content) {
  const response = await request.post(`${apiBaseUrl}/api/messages/private/${recipientUserId}`, {
    headers: {
      ...e2eHeaders,
      Authorization: `Bearer ${senderSession.token}`,
    },
    data: {
      content,
    },
  })

  expect(response.ok()).toBeTruthy()
}

async function uploadAttachment(request, session, itemId) {
  const response = await request.post(`${apiBaseUrl}/api/items/${itemId}/attachments`, {
    headers: {
      Authorization: `Bearer ${session.token}`,
      'X-E2E-Test': '1',
    },
    multipart: {
      file: {
        name: 'preview.png',
        mimeType: 'image/png',
        buffer: createTinyPngBuffer(),
      },
    },
  })

  expect(response.ok()).toBeTruthy()
}

async function applySession(page, session) {
  await page.addInitScript(([storageKey, payload]) => {
    window.localStorage.setItem(storageKey, JSON.stringify(payload))
  }, [
    sessionStorageKey,
    {
      token: session.token,
      user: session.user,
    },
  ])
}

async function preparePageForCapture(page) {
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
    `,
  })

  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready
    }
  })
}

async function waitForLoadingToFinish(page) {
  const loadingPatterns = [
    'Chargement',
    'Restauration de votre session en cours',
    'Connexion en cours',
    'Création en cours',
    'Mise à jour en cours',
    'Enregistrement...',
  ]

  for (const pattern of loadingPatterns) {
    const locator = page.getByText(pattern, { exact: false }).first()
    try {
      await locator.waitFor({ state: 'hidden', timeout: 8000 })
    } catch {
      // Certains écrans n'affichent pas ce texte : on passe au suivant.
    }
  }
}

async function settleUi(page) {
  await page.waitForLoadState('domcontentloaded')
  await preparePageForCapture(page)
  await waitForLoadingToFinish(page)
  await page.waitForTimeout(500)
}

async function capturePublicPage(page, url, waitLocator, filename) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await expect(waitLocator(page)).toBeVisible()
  await settleUi(page)
  await page.screenshot({
    path: path.join(screenshotDir, filename),
    fullPage: true,
  })
}

async function capturePrivatePage(page, session, url, waitLocator, filename) {
  await applySession(page, session)
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await expect(waitLocator(page)).toBeVisible()
  await settleUi(page)
  await page.screenshot({
    path: path.join(screenshotDir, filename),
    fullPage: true,
  })
}

async function captureCurrentView(page, filename) {
  await settleUi(page)
  await page.screenshot({
    path: path.join(screenshotDir, filename),
    fullPage: true,
  })
}

test('genere des captures full-page des pages principales', async ({ page, request }) => {
  await ensureScreenshotDir()

  const ownerSession = await registerUser(request, {
    firstname: 'Camille',
    lastname: 'Owner',
  })

  const contactSession = await registerUser(request, {
    firstname: 'Louis',
    lastname: 'Contact',
  })

  const vault = await createVault(request, ownerSession, {
    name: 'Streaming famille',
    description: 'Acces partages du foyer',
  })

  const item = await createItem(request, ownerSession, vault.id)
  await uploadAttachment(request, ownerSession, item.id)
  await addVaultMember(request, ownerSession, vault.id, {
    email: contactSession.email,
    role: 'EDITOR',
  })
  await sendVaultMessage(request, contactSession, vault.id, 'Bonjour depuis la discussion du trousseau.')
  await sendPrivateMessage(request, contactSession, ownerSession.user.id, 'Bonjour depuis la conversation privee.')

  await capturePublicPage(page, '/connexion', (currentPage) => currentPage.getByRole('button', { name: 'Se connecter', exact: true }), 'login-page-full.png')
  await capturePublicPage(page, '/inscription', (currentPage) => currentPage.getByRole('button', { name: "S'inscrire", exact: true }), 'register-page-full.png')
  await capturePublicPage(page, '/en-savoir-plus', (currentPage) => currentPage.getByRole('button', { name: 'Ouvrir le dashboard', exact: true }), 'marketing-page-full.png')
  await capturePublicPage(page, '/brand', (currentPage) => currentPage.getByRole('button', { name: 'Primary', exact: true }), 'brand-page-full.png')
  await capturePublicPage(
    page,
    '/oauth/callback#status=confirm&email=camille@example.com&firstname=Camille&lastname=Owner',
    (currentPage) => currentPage.getByRole('button', { name: 'Autoriser et continuer', exact: true }),
    'oauth-callback-page-full.png',
  )

  await capturePrivatePage(page, ownerSession, '/dashboard', (currentPage) => currentPage.getByText('Bienvenue dans votre espace Supwarden.', { exact: true }), 'dashboard-page-full.png')
  await page.getByRole('button', { name: 'Générer un mot de passe', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Générer un mot de passe', exact: true })).toBeVisible()
  await captureCurrentView(page, 'dashboard-password-generator-modal-full.png')
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()

  await page.getByRole('button', { name: 'Import / Exporter tout', exact: true }).click()
  await expect(page.getByText('Importer / Exporter', { exact: true })).toBeVisible()
  await captureCurrentView(page, 'dashboard-import-export-modal-full.png')
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()

  await capturePrivatePage(page, ownerSession, '/vaults', (currentPage) => currentPage.getByRole('button', { name: 'Créer un trousseau', exact: true }), 'vault-list-page-full.png')
  await expect(page.getByText('Streaming famille')).toBeVisible()
  await captureCurrentView(page, 'vault-list-page-full.png')

  await page.getByRole('button', { name: 'Import / Exporter tout', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText('Importer / Exporter', { exact: true })).toBeVisible()
  await captureCurrentView(page, 'vault-import-export-modal-full.png')
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()
  await expect(page.getByText('Importer / Exporter', { exact: true })).not.toBeVisible()

  await capturePrivatePage(page, ownerSession, '/vaults/nouveau', (currentPage) => currentPage.getByRole('button', { name: 'Créer le trousseau', exact: true }), 'vault-create-page-full.png')
  await capturePrivatePage(page, ownerSession, `/vaults/${vault.id}`, (currentPage) => currentPage.getByRole('heading', { name: 'Streaming famille', exact: true }), 'vault-detail-page-full.png')

  await page.getByRole('button', { name: 'Membres', exact: true }).click()
  await expect(page.getByText('Membres du trousseau', { exact: true })).toBeVisible()
  await captureCurrentView(page, 'vault-members-modal-full.png')
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()

  await page.getByRole('button', { name: 'Paramètres', exact: true }).click()
  await expect(page.getByText('Paramètres du trousseau', { exact: false })).toBeVisible()
  await captureCurrentView(page, 'vault-settings-modal-full.png')
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()

  await page.getByRole('button', { name: 'Générateur', exact: true }).click()
  await expect(page.getByText('Générer un mot de passe', { exact: true })).toBeVisible()
  await captureCurrentView(page, 'vault-password-generator-modal-full.png')
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()

  await page.getByRole('button', { name: 'Discussion', exact: true }).click()
  await expect(page.getByText('Discussion du trousseau', { exact: true })).toBeVisible()
  await expect(page.getByText('Bonjour depuis la discussion du trousseau.')).toBeVisible()
  await captureCurrentView(page, 'vault-chat-modal-full.png')
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()

  await page.getByRole('button', { name: 'Plus', exact: true }).first().click()
  await expect(page.getByText('Netflix famille', { exact: true })).toBeVisible()
  await expect(page.getByText('Élément', { exact: true })).toBeVisible()
  await captureCurrentView(page, 'vault-item-detail-modal-full.png')
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()

  await capturePrivatePage(page, ownerSession, `/vaults/${vault.id}/items/nouveau`, (currentPage) => currentPage.getByRole('button', { name: 'Créer l’élément', exact: true }), 'item-create-page-full.png')
  await capturePrivatePage(page, ownerSession, `/vaults/${vault.id}/items/${item.id}`, (currentPage) => currentPage.getByText('Détail de l’élément', { exact: false }), 'item-detail-page-full.png')
  await page.getByRole('button', { name: 'Consulter', exact: true }).click()
  await expect(page.getByText('Prévisualisation', { exact: true })).toBeVisible()
  await captureCurrentView(page, 'item-attachment-preview-modal-full.png')
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()
  await capturePrivatePage(page, ownerSession, `/vaults/${vault.id}/items/${item.id}/modifier`, (currentPage) => currentPage.getByRole('button', { name: 'Enregistrer les modifications', exact: true }), 'item-edit-page-full.png')
  await capturePrivatePage(page, ownerSession, '/profil', (currentPage) => currentPage.getByRole('button', { name: 'Enregistrer mes informations', exact: true }), 'profile-page-full.png')

  await page.locator('.profile-section').nth(1).locator('.profile-info-trigger').first().click()
  await expect(page.locator('.profile-section').nth(1).locator('.profile-info-tooltip').first()).toBeVisible()
  await captureCurrentView(page, 'profile-security-tooltip-full.png')

  await page.getByRole('heading', { name: 'Supprimer mon compte', exact: true }).scrollIntoViewIfNeeded()
  await captureCurrentView(page, 'profile-delete-section-full.png')

  await capturePrivatePage(page, ownerSession, '/messages', (currentPage) => currentPage.getByText('Choisissez une conversation', { exact: true }), 'messages-page-full.png')
  await expect(page.getByText('Bonjour depuis la conversation privee.')).toBeVisible()
  await captureCurrentView(page, 'messages-page-full.png')
})
