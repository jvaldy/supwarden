const apiBaseUrl = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export async function fetchNotificationStreamConfig(token) {
  const response = await fetch(`${apiBaseUrl}/api/notifications/stream-config`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
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
