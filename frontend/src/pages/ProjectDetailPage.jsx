import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { storeProjectId } from '../lib/apiHelpers'

function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = Number(id)

  useEffect(() => {
    if (!Number.isFinite(projectId)) {
      navigate('/projects', { replace: true })
      return
    }

    storeProjectId(projectId)
    const tab = searchParams.get('tab')
    const next = new URLSearchParams()
    next.set('detail', String(projectId))
    if (tab) next.set('tab', tab)
    navigate(`/projects?${next.toString()}`, { replace: true })
  }, [navigate, projectId, searchParams])

  return null
}

export default ProjectDetailPage
