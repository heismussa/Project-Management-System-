import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Alert, Segmented, Spin, Typography, message } from 'antd'
import api from '../lib/axios'
import { storeProjectId, unwrapItem } from '../lib/apiHelpers'
import { useActiveRoleName } from '../components/common/RoleGuard'
import { ROLES } from '../utility/Config.jsx'
import { useCurrentProjectName } from '../context/CurrentProjectContext'
import ImplementationPlanPage from './ImplementationPlanPage'
import TraceabilityTable from '../components/matrix/TraceabilityTable'
import DocumentList from '../components/documents/DocumentList'
import ClosurePanel from '../components/projects/ClosurePanel'
import { ReviewWorkspacePanel } from '../components/reviews/ReviewWorkspaceDrawer'

const { Title } = Typography

const PLANNER_SEGMENTS = [
  { label: 'Plan', value: 'plan' },
  { label: 'RTM', value: 'rtm' },
  { label: 'Documents', value: 'documents' },
  { label: 'Closure', value: 'closure' },
]

function ProjectDetailPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const roleName = useActiveRoleName()
  const isPlanner = roleName === ROLES.PPL
  const isReviewer = roleName === ROLES.PRV
  const isCoordinator = roleName === ROLES.PCO
  const isApprover = roleName === ROLES.PAP
  const projectId = Number(id)

  const defaultTab = isPlanner ? 'plan' : isReviewer || isCoordinator || isApprover ? 'reviews' : 'plan'
  const requestedTab = searchParams.get('tab') || defaultTab
  const tab = PLANNER_SEGMENTS.some((item) => item.value === requestedTab)
    ? requestedTab
    : requestedTab === 'progress'
      ? 'plan'
      : defaultTab === 'reviews'
        ? 'reviews'
        : 'plan'

  const { setCurrentProjectName } = useCurrentProjectName()
  const [project, setProject] = useState(null)
  const [workflow, setWorkflow] = useState(null)
  const [closure, setClosure] = useState(null)
  const [loading, setLoading] = useState(false)
  const [planToolbarEl, setPlanToolbarEl] = useState(null)

  const load = useCallback(async () => {
    if (!Number.isFinite(projectId)) return
    setLoading(true)
    try {
      const showRes = await api.get(`/projects/${projectId}`)
      setProject(unwrapItem(showRes.data))
      setWorkflow(showRes.data?.workflow ?? null)
      storeProjectId(projectId)

      if (tab === 'closure' || isPlanner) {
        const closureRes = await api
          .get(`/projects/${projectId}/closure-readiness`)
          .catch(() => ({ data: { data: null } }))
        setClosure(closureRes.data?.data || null)
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not load project.')
    } finally {
      setLoading(false)
    }
  }, [projectId, tab, isPlanner])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setCurrentProjectName(project?.name || '')
    return () => setCurrentProjectName('')
  }, [project?.name, setCurrentProjectName])

  const setTab = (next) => {
    const params = new URLSearchParams(searchParams)
    params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  if (!Number.isFinite(projectId)) {
    return <Alert type="error" message="Invalid project." />
  }

  // Reviewer / Coordinator / Approver: flat review panel (drawer-equivalent page).
  if (isReviewer || isCoordinator || isApprover) {
    return (
      <Spin spinning={loading && !project}>
        <div className="mb-4">
          <Link
            to={isCoordinator ? '/recommendations' : '/reviews'}
            className="text-sm text-[#650018]"
          >
            ← Back to {isCoordinator ? 'Recommendations' : 'Activity Queue'}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Title level={4} className="!mb-0">
              Project: {project?.name || '…'}
            </Title>
          </div>
        </div>
        <ReviewWorkspacePanel projectId={projectId} projectName={project?.name} onChanged={load} />
      </Spin>
    )
  }

  // Planner (and Admin acting in workspace): segmented tabs share a row with the tab's actions.
  return (
    <Spin spinning={loading && !project}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          options={PLANNER_SEGMENTS}
          value={PLANNER_SEGMENTS.some((item) => item.value === tab) ? tab : 'plan'}
          onChange={setTab}
        />
        <div ref={setPlanToolbarEl} className="flex flex-wrap items-center justify-end gap-3" />
      </div>

      {tab === 'plan' && <ImplementationPlanPage embedded toolbarContainer={planToolbarEl} />}
      {tab === 'rtm' && <TraceabilityTable embedded />}
      {tab === 'documents' && <DocumentList embedded />}
      {tab === 'closure' && (
        <ClosurePanel projectId={projectId} closure={closure} workflow={workflow} onChanged={load} />
      )}
    </Spin>
  )
}

export default ProjectDetailPage
