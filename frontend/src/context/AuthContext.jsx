import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../lib/axios'

const AuthContext = createContext()

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
      // If the backend endpoint exists, revoke the current token.
      // (Axios interceptor attaches Authorization using localStorage auth_token.)
      await api.post('/logout')
    } catch {
      // Even if server logout fails, clear the client session so you can continue.
    } finally {
      setUser(null)
      setToken(null)
      localStorage.clear()
    }
  }

  const value = useMemo(() => ({ user, token, login, logout, isLoadingAuth }), [user, token, isLoadingAuth])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
