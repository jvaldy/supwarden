import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

export function useAuth() {
  const contextValue = useContext(AuthContext)

  if (contextValue === null) {
    throw new Error('useAuth doit être utilisé dans AuthProvider.')
  }

  return contextValue
}
