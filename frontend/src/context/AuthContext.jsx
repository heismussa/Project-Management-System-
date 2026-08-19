import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../lib/axios'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user_data')
    return raw ? JSON.parse(raw) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(() => {
    const hasToken = Boolean(localStorage.getItem('auth_token'))
    const hasUser = Boolean(localStorage.getItem('user_data'))
    return hasToken && !hasUser
  })

  useEffect(() => {
    const hasToken = Boolean(localStorage.getItem('auth_token'))
    const hasUser = Boolean(localStorage.getItem('user_data'))

    if (!hasToken || hasUser) {
      setIsLoadingAuth(false)
      return
    }

    ;(async () => {
      try {
        const resp = await api.get('/me')
        const meUser = resp.data?.data ?? resp.data?.user ?? null
        if (!meUser) throw new Error('No user returned from /me')

        setUser(meUser)
        setToken(localStorage.getItem('auth_token'))
        localStorage.setItem('user_data', JSON.stringify(meUser))
      } catch (e) {
        localStorage.clear()
        setUser(null)
        setToken(null)
      } finally {
        setIsLoadingAuth(false)
      }
    })()
  }, [])

  const login = (userData, authToken) => {
    setUser(userData)
    setToken(authToken)
    localStorage.setItem('user_data', JSON.stringify(userData))
    localStorage.setItem('auth_token', authToken)
  }

  const logout = async () => {
    try {
      await api.post('/logout')
    } catch {
      // Even if server logout fails, clear the client session.
    } finally {
      setUser(null)
      setToken(null)
      localStorage.clear()
    }
  }

  const isAuthenticated = Boolean(token)

  const value = useMemo(
    () => ({ user, token, login, logout, isLoadingAuth, isAuthenticated }),
    [user, token, isLoadingAuth, isAuthenticated],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
