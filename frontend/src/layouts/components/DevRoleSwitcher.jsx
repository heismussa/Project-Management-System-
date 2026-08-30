import { Select } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../utility/Config.jsx'

const DEV_ROLE_OPTIONS = Object.values(ROLES).map((name) => ({ value: name, label: name }))

// DEV ONLY — forces `activeRole` to any role for quick manual testing of
// role-based access, independent of the roles actually assigned to the
// signed-in account. Never enabled outside local dev: gated behind
// VITE_USE_MOCK_AUTH so it can't ship to a real environment.
export default function DevRoleSwitcher() {
  const { activeRole, switchRole } = useAuth()
  const navigate = useNavigate()

  if (import.meta.env.VITE_USE_MOCK_AUTH !== 'true') return null

  return (
    <Select
      size="small"
      value={activeRole?.name}
      placeholder="Dev: switch role"
      onChange={(name) => {
        switchRole({ id: name, name })
        navigate('/', { replace: true })
      }}
      options={DEV_ROLE_OPTIONS}
      style={{ width: 190 }}
      popupMatchSelectWidth={false}
      aria-label="Dev role switcher"
    />
  )
}
