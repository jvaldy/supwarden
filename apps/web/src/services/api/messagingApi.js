const apiBaseUrl = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

async function requestMessagingJson(path, token, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
    ...options,
  })

  const responseText = await response.text()
  const responseData = responseText !== '' ? JSON.parse(responseText) : null

  if (!response.ok) {
    const error = new Error(responseData?.message ?? 'Une erreur est survenue.')
    error.status = response.status
    error.responseData = responseData
    throw error
  }

  return responseData
}

export function fetchVaultMessages(token, vaultId, options = {}) {
  const query = new URLSearchParams()
  if (options.limit) query.set('limit', String(options.limit))
  if (options.since) query.set('since', options.since)
  if (options.before) query.set('before', options.before)
  const suffix = query.toString() !== '' ? `?${query.toString()}` : ''

  return requestMessagingJson(`/api/vaults/${vaultId}/messages${suffix}`, token)
}

export function sendVaultMessage(token, vaultId, content) {
  return requestMessagingJson(`/api/vaults/${vaultId}/messages`, token, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export function fetchPrivateContacts(token) {
  return requestMessagingJson('/api/messages/private/contacts', token)
}

export function fetchPrivateMessages(token, userId, options = {}) {
  const query = new URLSearchParams()
  if (options.limit) query.set('limit', String(options.limit))
  if (options.since) query.set('since', options.since)
  if (options.before) query.set('before', options.before)
  const suffix = query.toString() !== '' ? `?${query.toString()}` : ''

  return requestMessagingJson(`/api/messages/private/${userId}${suffix}`, token)
}

export function sendPrivateMessage(token, userId, content) {
  return requestMessagingJson(`/api/messages/private/${userId}`, token, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}
