export function formatContactOption(contact) {
  const unreadSuffix = contact.unreadCount > 0 ? ` (?? ${contact.unreadCount})` : ''
  return `${contact.displayName} - ${contact.email}${unreadSuffix}`
}

export function formatMessageTimestamp(value) {
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getDisplayInitial(name) {
  return (name ?? 'U').trim().charAt(0).toUpperCase() || 'U'
}

