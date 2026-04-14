import { useEffect, useRef, useState } from 'react'
import { AuthContext } from './authContext.js'
import {
  confirmGoogleOAuthRegistration,
  deleteAuthenticatedUser,
  fetchAuthenticatedUser,
  loginUser,
  logoutUser,
  registerUser,
  setUnauthorizedResponseHandler,
  updateAuthenticatedUserProfile,
} from '../services/api/authApi.js'

const sessionStorageKey = 'supwarden.session'

function readStoredSession() {
  const storedValue = window.localStorage.getItem(sessionStorageKey)

  if (!storedValue) {
    return { token: null, user: null }
  }

  try {
    return JSON.parse(storedValue)
  } catch {
    window.localStorage.removeItem(sessionStorageKey)
    return { token: null, user: null }
  }
}

function readTokenExpiration(token) {
  if (!token) return null

  const [encodedPayload] = token.split('.')
  if (!encodedPayload) return null

  try {
    const normalizedPayload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=')
    const decodedPayload = JSON.parse(window.atob(paddedPayload))

    return typeof decodedPayload.exp === 'number' ? decodedPayload.exp * 1000 : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const initialSession = readStoredSession()
  const [session, setSession] = useState(initialSession)
  const [isSessionLoading, setIsSessionLoading] = useState(initialSession.token !== null)
  const logoutTimerReference = useRef(null)

  function clearStoredSession() {
    setSession({ token: null, user: null })
  }

  useEffect(() => {
    window.localStorage.setItem(sessionStorageKey, JSON.stringify(session))
  }, [session])

  useEffect(() => {
    setUnauthorizedResponseHandler(() => {
      clearStoredSession()
      setIsSessionLoading(false)
    })

    return () => {
      setUnauthorizedResponseHandler(null)
    }
  }, [])

  useEffect(() => {
    window.clearTimeout(logoutTimerReference.current)

    if (!session.token) return

    const expirationTimestamp = readTokenExpiration(session.token)
    if (expirationTimestamp === null) {
      clearStoredSession()
      return
    }

    const millisecondsBeforeExpiration = expirationTimestamp - Date.now()
    if (millisecondsBeforeExpiration <= 0) {
      clearStoredSession()
      return
    }

    logoutTimerReference.current = window.setTimeout(() => {
      clearStoredSession()
      setIsSessionLoading(false)
    }, millisecondsBeforeExpiration)

    return () => {
      window.clearTimeout(logoutTimerReference.current)
    }
  }, [session.token])

  useEffect(() => {
    let isCancelled = false

    async function restoreUserSession() {
      if (!session.token) {
        setIsSessionLoading(false)
        return
      }

      try {
        const responseData = await fetchAuthenticatedUser(session.token)

        if (!isCancelled) {
          setSession((currentSession) => ({
            ...currentSession,
            user: responseData.user,
          }))
        }
      } catch {
        if (!isCancelled) {
          clearStoredSession()
        }
      } finally {
        if (!isCancelled) {
          setIsSessionLoading(false)
        }
      }
    }

    restoreUserSession()

    return () => {
      isCancelled = true
    }
  }, [session.token])

  async function authenticateWithCredentials(credentials) {
    setIsSessionLoading(true)

    try {
      const responseData = await loginUser(credentials)
      setSession({ token: responseData.token, user: responseData.user })
      return responseData
    } finally {
      setIsSessionLoading(false)
    }
  }

  async function createAccount(accountData) {
    setIsSessionLoading(true)

    try {
      const responseData = await registerUser(accountData)
      setSession({ token: responseData.token, user: responseData.user })
      return responseData
    } finally {
      setIsSessionLoading(false)
    }
  }

  async function saveProfile(profileData) {
    if (!session.token) {
      throw new Error('Aucune session active.')
    }

    const responseData = await updateAuthenticatedUserProfile(session.token, profileData)

    setSession((currentSession) => ({
      ...currentSession,
      token: responseData.token ?? currentSession.token,
      user: responseData.user,
    }))

    return responseData
  }

  async function removeAccount(deletionData) {
    if (!session.token) {
      throw new Error('Aucune session active.')
    }

    const responseData = await deleteAuthenticatedUser(session.token, deletionData)
    clearStoredSession()
    setIsSessionLoading(false)

    return responseData
  }

  async function clearSession() {
    if (session.token) {
      try {
        await logoutUser(session.token)
      } catch {
        // La session locale reste la source de vérité même si la déconnexion API échoue.
      }
    }

    clearStoredSession()
    setIsSessionLoading(false)
  }

  async function restoreSessionFromExternalToken(token) {
    setSession({ token, user: null })
    setIsSessionLoading(true)
  }

  async function confirmOAuthRegistration() {
    setIsSessionLoading(true)

    try {
      const responseData = await confirmGoogleOAuthRegistration()
      setSession({ token: responseData.token, user: responseData.user })
      return responseData
    } finally {
      setIsSessionLoading(false)
    }
  }

  const contextValue = {
    authenticatedUser: session.user,
    token: session.token,
    isAuthenticated: session.token !== null,
    isSessionLoading,
    login: authenticateWithCredentials,
    register: createAccount,
    updateProfile: saveProfile,
    deleteAccount: removeAccount,
    logout: clearSession,
    completeOAuthSession: restoreSessionFromExternalToken,
    confirmOAuthRegistration,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

