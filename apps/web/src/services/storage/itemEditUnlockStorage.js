import { getSecretMaskTimeoutMs } from './secretVisibilityStorage.js'

const unlockedItemSecrets = new Map()

export function storeItemEditUnlock(itemId, secret) {
  if (!itemId || !secret) {
    return
  }

  // Le secret reste uniquement en memoire le temps de la transition vers le formulaire.
  unlockedItemSecrets.set(String(itemId), {
    secret,
    expiresAt: Date.now() + getSecretMaskTimeoutMs(),
  })
}

export function takeItemEditUnlock(itemId) {
  const entry = unlockedItemSecrets.get(String(itemId))

  if (!entry) {
    return ''
  }

  unlockedItemSecrets.delete(String(itemId))

  if (entry.expiresAt <= Date.now()) {
    return ''
  }

  return entry.secret
}

export function clearItemEditUnlock(itemId) {
  unlockedItemSecrets.delete(String(itemId))
}
