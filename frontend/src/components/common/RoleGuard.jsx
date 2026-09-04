import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../utility/Config.jsx'

export const SPEC_READ_ONLY_ROLES = [ROLES.PCO, ROLES.PAP, ROLES.PVO]

export const ACTIVITY_ACTION_ROLES = [ROLES.PPL, ROLES.PAD, ROLES.IS]

export function useActiveRoleName() {
  const { user, activeRole } = useAuth()
  return activeRole?.name ?? user?.role ?? null
}

export function isSpecReadOnlyRole(roleName) {
  return SPEC_READ_ONLY_ROLES.includes(roleName)
}

export function canShowActivityActionColumn(roleName) {
  return ACTIVITY_ACTION_ROLES.includes(roleName)
}

function RoleGuard({ allow = [], deny = [], children }) {
  const activeName = useActiveRoleName()
  const { user } = useAuth()

  if (!user) return null
  if (deny.length && deny.includes(activeName)) return null
  if (allow.length && !allow.includes(activeName)) return null

  return children
}

export default RoleGuard
