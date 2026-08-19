import { useAuth } from '../../context/AuthContext'

function RoleGuard({ allow = [], children }) {
  const { user } = useAuth()

  if (!user || !allow.includes(user.role)) return null

  return children
}

export default RoleGuard
