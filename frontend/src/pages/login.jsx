import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/axios'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setLoading(true)

    try {
      const response = await api.post('/login', { login: email, password })
      const user = response.data.user
      login(user, response.data.token)
      navigate('/')
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message
          || err.response?.data?.errors?.login?.[0]
          || 'Invalid email or password',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-mesh relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Soft mesh wash */}
      <div aria-hidden className="login-mesh__wash pointer-events-none absolute inset-0" />
      {/* Subtle 22px dot grid */}
      <div aria-hidden className="login-mesh__dots pointer-events-none absolute inset-0" />
      {/* Large blurred brand blobs behind the card */}
      <div aria-hidden className="login-mesh__blob login-mesh__blob--maroon pointer-events-none absolute" />
      <div aria-hidden className="login-mesh__blob login-mesh__blob--gold pointer-events-none absolute" />

      <div className="login-mesh-card relative z-10 w-full max-w-md overflow-hidden">
        {/* Header Banner */}
        <div
          className="p-6 text-center text-white"
          style={{ backgroundColor: '#962c30' }}
        >
          <img
            src="/nssf-logo.png"
            alt="NSSF Logo"
            className="mx-auto mb-3 h-20 w-auto rounded-lg"
          />
          <h1 className="text-2xl font-bold tracking-wide">National Social Security Fund</h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest" style={{ color: '#ffc20a' }}>
            Project Management System
          </p>
        </div>

        {/* Form Body */}
        <div className="space-y-5 p-8">
          {errorMessage && (
            <div
              className="rounded-lg p-3 text-sm font-medium text-white shadow-sm"
              style={{ backgroundColor: '#068737' }}
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="user@example.com"
                className="w-full rounded-lg border border-gray-300/80 bg-white/70 px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#F9B233]/70"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300/80 bg-white/70 px-4 py-2.5 pr-11 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#F9B233]/70"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center rounded-lg py-3 font-bold text-white shadow-md transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: '#962c30' }}
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </form>

          <div className="border-t border-gray-200/70 pt-4 text-center">
            <p className="text-xs text-gray-600">
              Accounts are created by ICT Support. Contact the help desk if you need access.
            </p>
          </div>
        </div>

        {/* Gold Accent Bar */}
        <div className="h-2 w-full" style={{ backgroundColor: '#F9B233' }} />
      </div>
    </div>
  )
}
