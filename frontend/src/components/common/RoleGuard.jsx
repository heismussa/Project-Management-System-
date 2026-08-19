import { useAuth } from '../../context/AuthContext'

function RoleGuard({ allow = [], children }) {
  const { user, activeRole } = useAuth()
  const activeName = activeRole?.name ?? user?.role

  if (!user || !allow.some((role) => role === activeName)) return null

  return children
}

export default RoleGuard
