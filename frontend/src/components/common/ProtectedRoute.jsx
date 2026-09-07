import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// UI-only gate: hides routes the signed-in role shouldn't reach and picks
// where to send them instead. The Laravel API must enforce these
// permissions independently — this only controls what the SPA renders.
function ProtectedRoute({ allow = [], children }) {
  const { user, activeRole, isLoadingAuth } = useAuth()

  if (isLoadingAuth) return null
  if (!user) return <Navigate to="/login" replace />
  if (allow.length > 0 && !allow.includes(activeRole?.name)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

export default ProtectedRoute
