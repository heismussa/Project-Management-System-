import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useSearchParams } from 'react-router-dom'
import { message, Modal, Space, Spin, Alert } from 'antd'
import { Plus } from 'lucide-react'
import dayjs from 'dayjs'
import { deriveStatus } from '../lib/status'
import ActivityFormModal from '../components/activities/ActivityFormModal'
import ActivityReviewDrawer from '../components/activities/ActivityReviewDrawer'
import PlanExportButton from '../components/activities/PlanExportButton'
import ActivitiesTable from '../components/activities/ActivitiesTable'
import WorkflowBar from '../components/activities/WorkflowBar'
import ActivityDocumentsModal from '../components/activities/ActivityDocumentsModal'
import ProjectPicker from '../components/common/ProjectPicker'
import PreventMutation from '../components/common/PreventMutation'
import { isSpecReadOnlyRole, useActiveRoleName } from '../components/common/RoleGuard'
import { ROLES } from '../utility/Config.jsx'
import api from '../lib/axios'
import {
  getStoredProjectId,
  storeProjectId,
  unwrapItem,
  unwrapList,
} from '../lib/apiHelpers'

const BLANK_ACTIVITY = {
  id: null,
  name: '',
  expected_deliverable: '',
  planned_start_date: null,
  planned_end_date: null,
  responsible_person_id: null,
}

function ImplementationPlanPage({ embedded = false, toolbarContainer = null } = {}) {
  const { id: routeId } = useParams()
  const [searchParams] = useSearchParams()
  const roleName = useActiveRoleName()
  const canAddActivity = !isSpecReadOnlyRole(roleName) && roleName !== ROLES.PRV
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [projectId, setProjectId] = useState(() => {
    const fromRoute = Number(routeId)
    if (Number.isFinite(fromRoute) && fromRoute > 0) {
      storeProjectId(fromRoute)
      return fromRoute
    }
    const fromQuery = searchParams.get('projectId')
    if (fromQuery) {
      const parsed = Number(fromQuery)
      if (!Number.isNaN(parsed)) {
        storeProjectId(parsed)
        return parsed
      }
    }
    return getStoredProjectId()
  })
  const [workflow, setWorkflow] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formTarget, setFormTarget] = useState(null)
  const [reviewTarget, setReviewTarget] = useState(null)
  const [reviewHistory, setReviewHistory] = useState([])
  const [docsTarget, setDocsTarget] = useState(null)
  const [filteredInfo, setFilteredInfo] = useState({})

  const people = users.map((user) => ({
    id: user.id,
    name: user.name,
    role: user.email,
  }))

  const loadWorkflow = useCallback(async (id) => {
    if (!id) {
      setWorkflow(null)
      return
    }
    const response = await api.get(`/projects/${id}/workflow`)
    setWorkflow(response.data?.data ?? null)
  }, [])

  const loadProjectsAndUsers = useCallback(async () => {
    try {
      // Embedded workspace already knows the project — skip the heavy GET /projects list.
      if (embedded) {
        const fromRoute = Number(routeId)
        if (Number.isFinite(fromRoute) && fromRoute > 0) {
          storeProjectId(fromRoute)
          setProjectId(fromRoute)
        }
        const usersRes = await api.get('/users')
        setUsers(unwrapList(usersRes.data))
        return
      }

      const [projectsRes, usersRes] = await Promise.all([
        api.get('/projects'),
        api.get('/users'),
      ])
      const projectList = unwrapList(projectsRes.data)
      setProjects(projectList)
      setUsers(unwrapList(usersRes.data))
      const fromRoute = Number(routeId)
      if (Number.isFinite(fromRoute) && fromRoute > 0) {
        storeProjectId(fromRoute)
        setProjectId(fromRoute)
        return
      }
      setProjectId((current) => {
        if (current && projectList.some((project) => project.id === current)) return current
        const first = projectList[0]?.id ?? null
        storeProjectId(first)
        return first
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load projects.')
    }
  }, [routeId, embedded])

  const loadActivities = useCallback(async (id) => {
    if (!id) {
      setActivities([])
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await api.get(`/projects/${id}/activities`)
      setActivities(unwrapList(response.data))
      await loadWorkflow(id)
    } catch (err) {
      setActivities([])
      setError(err.response?.data?.message || 'Could not load activities.')
    } finally {
      setLoading(false)
    }
  }, [loadWorkflow])

  useEffect(() => {
    loadProjectsAndUsers()
  }, [loadProjectsAndUsers])

  useEffect(() => {
    loadActivities(projectId)
  }, [projectId, loadActivities])

  useEffect(() => {
    const fromRoute = Number(routeId)
    if (Number.isFinite(fromRoute) && fromRoute > 0) {
      storeProjectId(fromRoute)
      setProjectId((current) => (current === fromRoute ? current : fromRoute))
    }
  }, [routeId])

  useEffect(() => {
    const queryProjectId = searchParams.get('projectId')
    if (!queryProjectId) return

    const parsed = Number(queryProjectId)
    if (!Number.isNaN(parsed)) {
      storeProjectId(parsed)
      setProjectId((current) => (current === parsed ? current : parsed))
    }
  }, [searchParams])

  const handleProjectChange = (id) => {
    storeProjectId(id)
    setProjectId(id)
  }

  const handleSaveForm = async (values) => {
    try {
      if (formTarget.id == null) {
        const response = await api.post('/activities', { ...values, project_id: projectId })
        const created = unwrapItem(response.data)
        setActivities((prev) => [...prev, created])
        message.success('Activity added')
      } else {
        const response = await api.put(`/activities/${formTarget.id}`, values)
        const updated = unwrapItem(response.data)
        setActivities((prev) => prev.map((activity) => (activity.id === updated.id ? updated : activity)))
        message.success(response.data?.message || 'Activity updated')
      }
      setFormTarget(null)
      loadWorkflow(projectId)
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not save activity.')
    }
  }

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete this activity?',
      content: 'This cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        await api.delete(`/activities/${id}`)
        setActivities((prev) => prev.filter((activity) => activity.id !== id))
        message.success('Activity deleted')
      },
    })
  }

  const loadReviewHistory = async (activityId) => {
    try {
      const response = await api.get(`/activities/${activityId}/progress`)
      setReviewHistory(unwrapList(response.data))
    } catch {
      setReviewHistory([])
    }
  }

  const openReview = async (activity) => {
    setReviewTarget(activity)
    await loadReviewHistory(activity.id)
  }

  const applyActivityUpdate = async (payload) => {
    const response = await api.put(`/activities/${reviewTarget.id}`, payload)
    const updated = unwrapItem(response.data)
    setActivities((prev) => prev.map((activity) => (activity.id === updated.id ? updated : activity)))
    setReviewTarget(updated)
    await loadReviewHistory(updated.id)
    return updated
  }

  const handleSaveActualStart = async (actual_start_date) => {
    try {
      const status = deriveStatus({ actual_start_date, actual_end_date: reviewTarget.actual_end_date })
      await applyActivityUpdate({ actual_start_date, status })
      message.success('Actual start saved')
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not save actual start.')
    }
  }

  const handleMarkComplete = async () => {
    try {
      await applyActivityUpdate({
        actual_end_date: dayjs().format('YYYY-MM-DD'),
        status: 'completed',
        remark: 'Activity marked complete.',
      })
      message.success('Activity marked complete')
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not mark activity complete.')
    }
  }

  const handleAddRemark = async (remark) => {
    try {
      await applyActivityUpdate({ remark })
      message.success('Remark added')
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not add remark.')
    }
  }

  const handleApproveChange = async (activity) => {
    try {
      const response = await api.post(`/activities/${activity.id}/plan-changes/approve`)
      const updated = unwrapItem(response.data)
      setActivities((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setReviewTarget((prev) => (prev && prev.id === updated.id ? updated : prev))
      message.success('Plan change approved')
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not approve change.')
    }
  }

  const handleRejectChange = async (activity) => {
    try {
      const response = await api.post(`/activities/${activity.id}/plan-changes/reject`, {
        comment: 'Plan change rejected by reviewer',
      })
      const updated = unwrapItem(response.data)
      setActivities((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setReviewTarget((prev) => (prev && prev.id === updated.id ? updated : prev))
      message.success('Plan change rejected')
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not reject change.')
    }
  }

  const handleSubmitProgressReview = async (activity) => {
    try {
      const response = await api.post(`/activities/${activity.id}/progress-review/submit`)
      const updated = unwrapItem(response.data)
      setActivities((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setReviewTarget((prev) => (prev && prev.id === updated.id ? updated : prev))
      message.success('Submitted to the reviewer')
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not submit for review.')
    }
  }

  const planStatus = workflow?.plan_review_status

  const visibleActivities = activities.filter((activity) => {
    const phaseFilter = filteredInfo.phase
    if (phaseFilter?.length && !phaseFilter.includes(activity.phase)) return false
    const statusFilter = filteredInfo.status
    if (statusFilter?.length && !statusFilter.includes(deriveStatus(activity))) return false
    return true
  })

  const toolbar = (
    <Space wrap size="middle" className="ms-auto justify-end">
      {!embedded && (
        <ProjectPicker projects={projects} value={projectId} onChange={handleProjectChange} />
      )}
      <PlanExportButton activities={activities} />
      {canAddActivity && (
        <PreventMutation fallback={null}>
          <button
            type="button"
            disabled={!projectId || planStatus === 'pending_review'}
            onClick={() => setFormTarget(BLANK_ACTIVITY)}
            className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: '#7A0C22', height: 42, padding: '0 22px' }}
          >
            <Plus size={16} />
            Add activity
          </button>
        </PreventMutation>
      )}
    </Space>
  )

  return (
    <div className="flex flex-col gap-6">
      {toolbarContainer ? (
        createPortal(toolbar, toolbarContainer)
      ) : (
        <div className="flex w-full flex-wrap items-center justify-end gap-3">{toolbar}</div>
      )}

      <WorkflowBar projectId={projectId} workflow={workflow} />

      {error && <Alert type="error" showIcon message={error} />}

      <Spin spinning={loading}>
        <ActivitiesTable
          activities={activities}
          visibleActivities={visibleActivities}
          filteredInfo={filteredInfo}
          onTableChange={(_pagination, filters) => setFilteredInfo(filters)}
          onReview={openReview}
          people={people}
        />
      </Spin>

      <ActivityFormModal
        open={formTarget !== null}
        activity={formTarget}
        people={people}
        onCancel={() => setFormTarget(null)}
        onSave={handleSaveForm}
      />
      <ActivityReviewDrawer
        open={reviewTarget !== null}
        activity={reviewTarget}
        people={people}
        history={reviewHistory}
        onClose={() => {
          setReviewTarget(null)
          setReviewHistory([])
        }}
        onSaveActualStart={handleSaveActualStart}
        onMarkComplete={handleMarkComplete}
        onAddRemark={handleAddRemark}
        onApproveChange={handleApproveChange}
        onRejectChange={handleRejectChange}
        onSubmitForReview={handleSubmitProgressReview}
      />
      <ActivityDocumentsModal
        open={docsTarget !== null}
        activity={docsTarget}
        projectId={projectId}
        onCancel={() => setDocsTarget(null)}
      />
    </div>
  )
}

export default ImplementationPlanPage
