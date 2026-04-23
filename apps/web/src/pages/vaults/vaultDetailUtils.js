export function formatRole(role) {
  if (role === 'OWNER') return 'Propriétaire'
  if (role === 'EDITOR') return 'Éditeur'
  return 'Lecteur'
}

export function formatDateTime(value) {
  if (!value) return 'Non renseigné'

  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function formatMemberDate(value) {
  if (!value) return 'Non renseigné'
  return formatDateTime(value)
}

export function formatFieldType(type) {
  if (type === 'HIDDEN') return 'Masqué'
  if (type === 'BOOLEAN') return 'Booléen'
  if (type === 'NUMBER') return 'Nombre'
  return 'Texte'
}

export function formatAttachmentMeta(attachment) {
  const size = typeof attachment?.size === 'number' ? `${Math.max(1, Math.round(attachment.size / 1024))} Ko` : 'Taille inconnue'
  return [attachment?.mimeType, size].filter(Boolean).join(' - ')
}

export function readSecretUnlockError(error, fallbackMessage) {
  const message = error?.responseData?.message ?? error?.message ?? ''

  if (message.includes('PIN fourni est invalide')) {
    return 'Impossible d’afficher ce mot de passe pour le moment. Le code PIN est incorrect.'
  }

  if (message.includes('mot de passe du compte est invalide')) {
    return 'Impossible d’afficher ce mot de passe pour le moment. Le mot de passe du compte est incorrect.'
  }

  return fallbackMessage
}

export function isPreviewableAttachment(attachment) {
  const mimeType = attachment?.mimeType ?? ''
  return mimeType.startsWith('image/') || mimeType === 'application/pdf'
}

export async function requestSensitiveUnlockProof(requestSecretCredential, requestPin, canUsePin, message) {
  if (typeof requestSecretCredential === 'function') {
    return requestSecretCredential(message, { allowPin: canUsePin })
  }

  if (!canUsePin || typeof requestPin !== 'function') {
    return null
  }

  const pin = await requestPin('Saisissez votre code PIN pour déverrouiller ce secret.')
  if (pin === null) {
    return null
  }

  return { method: 'pin', value: pin }
}

