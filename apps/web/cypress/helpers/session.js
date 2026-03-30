const apiBaseUrl = 'http://localhost:8000'
const sessionStorageKey = 'supwarden.session'

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
    .request('POST', `${apiBaseUrl}/api/auth/register`, {
      email,
      password,
      firstname,
      lastname,
    })
    .then(({ body }) => ({
      email,
      password,
      token: body.token,
      user: body.user,
    }))
}

export function loginUserThroughApi({ email, password }) {
  return cy.request('POST', `${apiBaseUrl}/api/auth/login`, {
    email,
    password,
  })
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