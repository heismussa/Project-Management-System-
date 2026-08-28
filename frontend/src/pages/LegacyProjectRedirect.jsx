import { Navigate, useSearchParams } from 'react-router-dom'
import { getStoredProjectId } from '../lib/apiHelpers'

export default function LegacyProjectRedirect({ tab }) {
  const [searchParams] = useSearchParams()
  const fromQuery = Number(searchParams.get('projectId'))
  const id = Number.isFinite(fromQuery) && fromQuery > 0 ? fromQuery : getStoredProjectId()
  if (!id) return <Navigate to="/projects" replace />
  const next = new URLSearchParams(searchParams)
  next.delete('projectId')
  next.set('tab', tab)
  const suffix = next.toString()
  return <Navigate to={`/projects/${id}${suffix ? `?${suffix}` : ''}`} replace />
}
