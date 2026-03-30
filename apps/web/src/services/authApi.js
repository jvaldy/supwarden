const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

let onUnauthorizedResponse = null

// Centralise les appels HTTP liés à l’authentification et au profil.
async function requestJson(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    credentials: 'include',
    ...options,
  })

  const responseText = await response.text()
  const responseData = responseText !== '' ? JSON.parse(responseText) : null

  if (!response.ok) {
    if (response.status === 401 && typeof onUnauthorizedResponse === 'function') {
      onUnauthorizedResponse()
    }

    const error = new Error(responseData?.message ?? 'Une erreur est survenue.')
    error.status = response.status
    error.responseData = responseData
    throw error
  }

  return responseData
}

export function setUnauthorizedResponseHandler(callback) {
  onUnauthorizedResponse = callback
}

// Crée un compte local avec le flux d'inscription classique.
export function registerUser({ email, firstname, lastname, password }) {
  return requestJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      firstname,
      lastname,
      password,
    }),
  })
}

// Authentifie un utilisateur avec son e-mail et son mot de passe.
export function loginUser({ email, password }) {
  return requestJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
    }),
  })
}

// Expose l'URL backend qui démarre le parcours OAuth Google.
export function getGoogleOAuthRedirectUrl() {
  return `${apiBaseUrl}/api/auth/oauth/google/redirect`
}

// Confie au navigateur la redirection complète vers Google.
export function redirectToGoogleOAuth() {
  window.location.assign(getGoogleOAuthRedirectUrl())
}

// Finalise côté API une première connexion Google encore en attente de confirmation.
export function confirmGoogleOAuthRegistration() {
  return requestJson('/api/auth/oauth/google/confirm', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

// Demande l'invalidation serveur du jeton courant.
export function logoutUser(token) {
  return requestJson('/api/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

// Recharge le profil authentifié à partir du jeton déjà stocké.
export function fetchAuthenticatedUser(token) {
  return requestJson('/api/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

// Regroupe les mises à jour de profil dans un seul point d'entrée HTTP.
export function updateAuthenticatedUserProfile(token, profileData) {
  return requestJson('/api/me', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  })
}

// Supprime le compte courant après confirmation des données sensibles.
export function deleteAuthenticatedUser(token, deletionData) {
  return requestJson('/api/me', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(deletionData),
  })
}

// Charge la vue administrateur réservée aux comptes disposant du bon rôle.
export function fetchAdminUsers(token) {
  return requestJson('/api/admin/users', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}
