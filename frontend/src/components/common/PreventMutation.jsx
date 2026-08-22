import { isSpecReadOnlyRole, useActiveRoleName } from './RoleGuard'

/**
 * Hides mutation UI for Coordinator, Approver, and ViewOnly.
 * Read-only users see `fallback` (default: an em dash).
 */
export default function PreventMutation({ children, fallback = '—' }) {
  const roleName = useActiveRoleName()
  if (isSpecReadOnlyRole(roleName)) {
    return typeof fallback === 'string' ? (
      <span className="text-gray-400">{fallback}</span>
    ) : (
      fallback
    )
  }
  return children
}
