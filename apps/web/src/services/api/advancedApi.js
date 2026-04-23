const apiBaseUrl = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

function sanitizeForFileName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildFileDateSuffix() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${year}${month}${day}-${hours}${minutes}`
}

async function requestToolsJson(path, token, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers ?? {}),
    },
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
    const error = new Error(responseData?.message ?? 'Une erreur est survenue.')
    error.status = response.status
    error.responseData = responseData
    throw error
  }

  return responseData
}

export function generatePassword(token, options) {
  return requestToolsJson('/api/tools/password/generate', token, {
    method: 'POST',
    body: JSON.stringify(options),
  })
}

export function fetchUsageStats(token) {
  return requestToolsJson('/api/tools/stats', token)
}

export function importDataFile(token, file, format) {
  const formData = new FormData()
  formData.append('file', file)

  if (format) {
    formData.append('format', format)
  }

  return requestToolsJson('/api/tools/import', token, {
    method: 'POST',
    body: formData,
  })
}

export async function exportDataFile(token, format) {
  const response = await fetch(`${apiBaseUrl}/api/tools/export?format=${encodeURIComponent(format)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const error = new Error(payload?.message ?? 'Impossible d’exporter les données.')
    error.status = response.status
    throw error
  }

  const blob = await response.blob()
  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = format === 'csv' ? 'supwarden-export.csv' : 'supwarden-export.json'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl)
  }, 1000)
}

export async function exportVaultDataFile(token, vaultId, format = 'json', vaultName = '') {
  const response = await fetch(`${apiBaseUrl}/api/vaults/${vaultId}/export?format=${encodeURIComponent(format)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const error = new Error(payload?.message ?? 'Impossible d’exporter ce trousseau.')
    error.status = response.status
    throw error
  }

  const blob = await response.blob()
  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl

  const safeVaultName = sanitizeForFileName(vaultName) || `trousseau-${vaultId}`
  const suffix = buildFileDateSuffix()
  link.download = format === 'csv'
    ? `Supwarden_${safeVaultName}_${suffix}.csv`
    : `Supwarden_${safeVaultName}_${suffix}.json`

  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl)
  }, 1000)
}

