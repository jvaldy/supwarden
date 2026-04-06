const SECRET_MASK_TIMEOUT_KEY = 'supwarden.secretMaskTimeoutSeconds'
export const SECRET_MASK_TIMEOUT_EVENT = 'supwarden:secret-mask-timeout-changed'
const DEFAULT_SECRET_MASK_TIMEOUT_SECONDS = 300

export function getSecretMaskTimeoutSeconds() {
  if (typeof window === 'undefined') {
    return DEFAULT_SECRET_MASK_TIMEOUT_SECONDS
  }

  const rawValue = window.localStorage.getItem(SECRET_MASK_TIMEOUT_KEY)
  const parsedValue = Number.parseInt(rawValue ?? '', 10)

  // Replie vers la valeur par defaut si le stockage a ete vide ou altere.
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return DEFAULT_SECRET_MASK_TIMEOUT_SECONDS
  }

  return parsedValue
}

export function getSecretMaskTimeoutMs() {
  return getSecretMaskTimeoutSeconds() * 1000
}

export function setSecretMaskTimeoutSeconds(nextValue) {
  if (typeof window === 'undefined') {
    return DEFAULT_SECRET_MASK_TIMEOUT_SECONDS
  }

  const normalizedValue = Number.parseInt(String(nextValue), 10)
  const safeValue = Number.isFinite(normalizedValue) && normalizedValue > 0
    ? normalizedValue
    : DEFAULT_SECRET_MASK_TIMEOUT_SECONDS

  window.localStorage.setItem(SECRET_MASK_TIMEOUT_KEY, String(safeValue))
  window.dispatchEvent(
    new CustomEvent(SECRET_MASK_TIMEOUT_EVENT, {
      detail: { seconds: safeValue },
    }),
  )
  return safeValue
}

export function getSecretMaskTimeoutOptions() {
  return [
    { value: 30, label: '30 secondes' },
    { value: 60, label: '1 minute' },
    { value: 120, label: '2 minutes' },
    { value: 300, label: '5 minutes' },
    { value: 600, label: '10 minutes' },
  ]
}
