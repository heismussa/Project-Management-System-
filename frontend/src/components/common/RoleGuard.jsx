import { useAuth } from '../../context/AuthContext'
import { getUserRoleNames } from '../../layouts/nav'

function RoleGuard({ allow = [], children }) {
  const { user } = useAuth()
  const roleNames = getUserRoleNames(user)

  if (!user || !allow.some((role) => roleNames.includes(role) || user.role === role)) return null

  return children
}

export default RoleGuard
