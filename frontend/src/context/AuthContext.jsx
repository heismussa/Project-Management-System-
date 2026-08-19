import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

const STORAGE_KEY = 'pms.auth'

// Mock user — stands in for a real login response until the API exists.
const MOCK_USER = {
  id: 1,
  full_name: 'Tee Kulunge',
  role: 'project_coordinator',
}

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function AuthProvider({ children }) {
  // No login page yet — default to a signed-in mock user so the shell has
  // someone to show in the header. Once a login flow exists, default this
  // back to { token: null, user: null }.
  const [auth, setAuth] = useState(() => readStoredAuth() ?? { token: 'mock-token', user: MOCK_USER })

  useEffect(() => {
    if (auth.token && auth.user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [auth])

  const login = (overrides = {}) => {
    setAuth({
      token: 'mock-token',
      user: { ...MOCK_USER, ...overrides },
    })
  }

  const logout = () => {
    setAuth({ token: null, user: null })
  }

  const value = {
    token: auth.token,
    user: auth.user,
    isAuthenticated: Boolean(auth.token),
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// eslint-disable-next-line react-refresh/only-export-components
export { AuthProvider, useAuth }
