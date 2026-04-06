const apiBaseUrl = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

async function requestItemJson(path, token, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
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

export function fetchVaultItems(token, vaultId) {
  return requestItemJson(`/api/vaults/${vaultId}/items`, token)
}

export function createVaultItem(token, vaultId, itemData) {
  return requestItemJson(`/api/vaults/${vaultId}/items`, token, {
    method: 'POST',
    body: JSON.stringify(itemData),
  })
}

export function fetchVaultItem(token, itemId) {
  return requestItemJson(`/api/items/${itemId}`, token)
}

export function unlockVaultItemSecret(token, itemId, pin) {
  return requestItemJson(`/api/items/${itemId}/unlock-secret`, token, {
    method: 'POST',
    body: JSON.stringify({ pin }),
  })
}

export function updateVaultItem(token, itemId, itemData) {
  return requestItemJson(`/api/items/${itemId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(itemData),
  })
}

export function deleteVaultItem(token, itemId) {
  return requestItemJson(`/api/items/${itemId}`, token, {
    method: 'DELETE',
  })
}

export function uploadVaultItemAttachment(token, itemId, file) {
  const formData = new FormData()
  formData.append('file', file)

  return requestItemJson(`/api/items/${itemId}/attachments`, token, {
    method: 'POST',
    body: formData,
  })
}

export function deleteVaultItemAttachment(token, attachmentId) {
  return requestItemJson(`/api/attachments/${attachmentId}`, token, {
    method: 'DELETE',
  })
}

export async function downloadVaultItemAttachment(token, attachment) {
  const downloadPath = attachment.downloadUrl ?? `/api/attachments/${attachment.id}/download`
  const response = await fetch(`${apiBaseUrl}${downloadPath}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const error = new Error('Impossible de télécharger la pièce jointe.')
    error.status = response.status
    throw error
  }

  const blob = await response.blob()
  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = attachment.name ?? `piece-jointe-${attachment.id}`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl)
  }, 1000)
}



