import { useCallback, useEffect, useState } from 'react'
import { Segmented } from 'antd'
import api from '../../lib/axios'
import { storeProjectId } from '../../lib/apiHelpers'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../utility/Config.jsx'
import ImplementationPlanPage from '../../pages/ImplementationPlanPage'
import TraceabilityTable from '../matrix/TraceabilityTable'
import DocumentList from '../documents/DocumentList'
import ClosurePanel from './ClosurePanel'
import { ReviewWorkspacePanel } from '../reviews/ReviewWorkspaceDrawer'

const WORKSPACE_TABS = [
  { label: 'Plan', value: 'plan' },
  { label: 'RTM', value: 'rtm' },
  { label: 'Documents', value: 'documents' },
  { label: 'Closure', value: 'closure' },
]

export function defaultWorkspaceTab(project, roleName) {
  const inExecution =
    Boolean(project?.execution_started_at) ||
    project?.status === 'In Execution' ||
    project?.phase === 'Execution'

  if (roleName === ROLES.PPL && inExecution) return 'rtm'
  return 'plan'
}

export default function ProjectWorkspaceTabs({
  projectId,
  project,
  activeTab,
  onTabChange,
  workflow,
  onProjectChanged,
  onActivityReview,
  shouldShowActivityReview,
}) {
  const { activeRole } = useAuth()
  const isReviewer = activeRole?.name === ROLES.PRV
  const [planToolbarEl, setPlanToolbarEl] = useState(null)
  const [closure, setClosure] = useState(null)

  useEffect(() => {
    if (projectId) storeProjectId(projectId)
  }, [projectId])

  const loadClosure = useCallback(async () => {
    if (!projectId) {
      setClosure(null)
      return
    }
    try {
      const response = await api.get(`/projects/${projectId}/closure-readiness`)
      setClosure(response.data?.data || null)
    } catch {
      setClosure(null)
    }
  }, [projectId])

  useEffect(() => {
    if (activeTab === 'closure' || activeTab === 'plan') {
      loadClosure()
    }
  }, [activeTab, loadClosure])

  const handleChanged = () => {
    loadClosure()
    onProjectChanged?.()
  }

  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Segmented options={WORKSPACE_TABS} value={activeTab} onChange={onTabChange} />
        {activeTab === 'plan' && (
          <div ref={setPlanToolbarEl} className="flex min-h-[42px] flex-wrap items-center justify-end gap-3" />
        )}
      </div>

      {activeTab === 'plan' && (
        <>
          {isReviewer && (
            <div className="mb-4 rounded border border-gray-200 p-3">
              <ReviewWorkspacePanel
                projectId={projectId}
                projectName={project?.name}
                onChanged={handleChanged}
              />
            </div>
          )}
          <ImplementationPlanPage
            embedded
            projectId={projectId}
            toolbarContainer={planToolbarEl}
            onActivityReview={onActivityReview}
            onProjectChanged={handleChanged}
            shouldShowActivityReview={shouldShowActivityReview}
          />
        </>
      )}

      {activeTab === 'rtm' && <TraceabilityTable embedded projectId={projectId} />}
      {activeTab === 'documents' && <DocumentList embedded projectId={projectId} />}
      {activeTab === 'closure' && (
        <ClosurePanel
          projectId={projectId}
          closure={closure}
          workflow={workflow}
          onChanged={handleChanged}
        />
      )}
    </div>
  )
}
