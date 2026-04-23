const apiBaseUrl = 'http://localhost:8000'
const sessionStorageKey = 'supwarden.session'
const e2eHeaders = {
  'X-E2E-Test': '1',
}

export function uniqueEmail(prefix = 'camille') {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`
}

export function registerUserThroughApi({
  email = uniqueEmail(),
  password = 'motdepasse123',
  firstname = 'Camille',
  lastname = 'Durand',
} = {}) {
  return cy
    .request({
      method: 'POST',
      url: `${apiBaseUrl}/api/auth/register`,
      headers: e2eHeaders,
      timeout: 120000,
      body: {
        email,
        password,
        firstname,
        lastname,
      },
      failOnStatusCode: false,
    })
    .then(({ status, body }) => {
      if (status === 201) {
        return {
          email,
          password,
          token: body.token,
          user: body.user,
        }
      }

      if (status === 422 && body?.errors?.email?.includes('Cette adresse e-mail est déjà utilisée.')) {
        return loginUserThroughApi({ email, password })
      }

      throw new Error(body?.message ?? `Inscription API impossible (${status}).`)
    })
}

export function loginUserThroughApi({ email, password }) {
  return cy
    .request({
      method: 'POST',
      url: `${apiBaseUrl}/api/auth/login`,
      headers: e2eHeaders,
      timeout: 60000,
      body: {
        email,
        password,
      },
    })
    .then(({ body }) => ({
      email,
      password,
      token: body.token,
      user: body.user,
    }))
}

export function storeSession(win, session) {
  win.localStorage.setItem(
    sessionStorageKey,
    JSON.stringify({
      token: session.token,
      user: session.user,
    }),
  )
}

export function visitWithSession(path, session) {
  cy.visit(path, {
    onBeforeLoad(win) {
      storeSession(win, session)
    },
  })
}
