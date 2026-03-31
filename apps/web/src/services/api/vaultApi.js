const apiBaseUrl = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

// Regroupe les appels HTTP liés aux trousseaux et à leurs membres.
async function requestVaultJson(path, token, options = {}) {
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

// Charge la liste des trousseaux accessibles avec une recherche optionnelle.
export function fetchVaults(token, searchQuery = '') {
  const searchSuffix = searchQuery.trim() !== '' ? `?q=${encodeURIComponent(searchQuery.trim())}` : ''
  return requestVaultJson(`/api/vaults${searchSuffix}`, token)
}

// Crée un nouveau trousseau, toujours personnel à l'origine.
export function createVault(token, vaultData) {
  return requestVaultJson('/api/vaults', token, {
    method: 'POST',
    body: JSON.stringify(vaultData),
  })
}

// Récupère le détail complet d'un trousseau et de ses membres.
export function fetchVault(token, vaultId) {
  return requestVaultJson(`/api/vaults/${vaultId}`, token)
}

// Met à jour les métadonnées d'un trousseau existant.
export function updateVault(token, vaultId, vaultData) {
  return requestVaultJson(`/api/vaults/${vaultId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(vaultData),
  })
}

// Supprime définitivement un trousseau autorisé.
export function deleteVault(token, vaultId) {
  return requestVaultJson(`/api/vaults/${vaultId}`, token, {
    method: 'DELETE',
  })
}

// Liste les membres d'un trousseau accessible.
export function fetchVaultMembers(token, vaultId) {
  return requestVaultJson(`/api/vaults/${vaultId}/members`, token)
}

// Ajoute un membre existant à un trousseau.
export function addVaultMember(token, vaultId, memberData) {
  return requestVaultJson(`/api/vaults/${vaultId}/members`, token, {
    method: 'POST',
    body: JSON.stringify(memberData),
  })
}

// Met à jour le rôle d'un membre déjà présent dans le trousseau.
export function updateVaultMember(token, vaultId, memberId, memberData) {
  return requestVaultJson(`/api/vaults/${vaultId}/members/${memberId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(memberData),
  })
}

// Retire un membre d'un trousseau.
export function deleteVaultMember(token, vaultId, memberId) {
  return requestVaultJson(`/api/vaults/${vaultId}/members/${memberId}`, token, {
    method: 'DELETE',
  })
}
