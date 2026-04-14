const apiBaseUrl = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

let onUnauthorizedResponse = null

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
  let responseData = null

  try {
    responseData = responseText !== '' ? JSON.parse(responseText) : null
  } catch {
    responseData = null
  }

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

export function loginUser({ email, password }) {
  return requestJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
    }),
  })
}

export function getGoogleOAuthRedirectUrl() {
  return `${apiBaseUrl}/api/auth/oauth/google/redirect`
}

export function redirectToGoogleOAuth() {
  window.location.assign(getGoogleOAuthRedirectUrl())
}

export function confirmGoogleOAuthRegistration() {
  return requestJson('/api/auth/oauth/google/confirm', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function logoutUser(token) {
  return requestJson('/api/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export function fetchAuthenticatedUser(token) {
  return requestJson('/api/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export function verifyUserPin(token, pin) {
  return requestJson('/api/me/verify-pin', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pin }),
  })
}

export function updateAuthenticatedUserProfile(token, profileData) {
  return requestJson('/api/me', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  })
}

export function deleteAuthenticatedUser(token, deletionData) {
  return requestJson('/api/me', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(deletionData),
  })
}

export function fetchAdminUsers(token) {
  return requestJson('/api/admin/users', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

