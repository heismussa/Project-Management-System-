import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/axios'
import './login.css'

const REMEMBER_KEY = 'pms_login_email'

export default function Login() {
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) || '')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem(REMEMBER_KEY)))
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setInfoMessage('')
    setLoading(true)

    try {
      const response = await api.post('/login', { login: email, password })
      const user = response.data.user
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, email)
      } else {
        localStorage.removeItem(REMEMBER_KEY)
      }
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
    <div className="login-page">
      <section className="login-page__hero" aria-label="NSSF branding">
        <img
          className="login-page__hero-image"
          src="/login-building.jpg"
          alt=""
          aria-hidden="true"
        />
        <div className="login-page__hero-shade" aria-hidden="true" />
        <div className="login-page__hero-copy">
          <h1 className="login-page__headline">
            Building
            <br />
            <em>the</em> Future,
            <br />
            Securing
            <br />
            the Nation
          </h1>
          <hr className="login-page__rule" />
          <p className="login-page__tagline">
            Empowering Tanzania&apos;s workforce through transparent project delivery,
            accountability, and long-term national growth.
          </p>
        </div>
      </section>

      <section className="login-page__panel-wrap" aria-label="Sign in">
        <svg
          className="login-page__wave"
          viewBox="0 0 120 1000"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M120 0C70 90 10 180 28 310c22 160 110 210 88 380-20 150-92 210-76 310H120V0Z"
          />
        </svg>

        <div className="login-page__panel">
          <div className="login-page__brand">
            <img
              className="login-page__logo"
              src="/nssf-logo.png"
              alt="National Social Security Fund"
            />
            <h2 className="login-page__system">Project Management System</h2>
          </div>

          {(errorMessage || infoMessage) && (
            <div
              className="login-page__error"
              style={infoMessage ? { background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' } : undefined}
              role="alert"
            >
              {errorMessage || infoMessage}
            </div>
          )}

          <form className="login-page__form" onSubmit={handleSubmit}>
            <div className="login-page__field">
              <label className="login-page__label" htmlFor="login-email">
                Email
              </label>
              <div className="login-page__input-wrap">
                <input
                  id="login-email"
                  className="login-page__input"
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <span className="login-page__input-icon" aria-hidden="true">
                  <Mail size={18} />
                </span>
              </div>
            </div>

            <div className="login-page__field">
              <label className="login-page__label" htmlFor="login-password">
                Password
              </label>
              <div className="login-page__input-wrap">
                <input
                  id="login-password"
                  className="login-page__input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="login-page__input-icon is-button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-page__row">
              <label className="login-page__remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <button
                type="button"
                className="login-page__forgot"
                onClick={() => {
                  setErrorMessage('')
                  setInfoMessage('Contact ICT Support to reset your password.')
                }}
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="login-page__submit" disabled={loading}>
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              {!loading && <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" />}
            </button>
          </form>

          <p className="login-page__hint">
            Accounts are created by ICT Support. Contact the help desk if you need access.
          </p>
        </div>
      </section>
    </div>
  )
}
