import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useSearchParams } from 'react-router-dom'
import { message, Modal, Space, Spin, Alert } from 'antd'
import { Plus } from 'lucide-react'
import dayjs from 'dayjs'
import { deriveStatus } from '../lib/status'
import ActivityFormModal from '../components/activities/ActivityFormModal'
import ActivityReviewDrawer from '../components/activities/ActivityReviewDrawer'
import ActivityDetailsModal from '../components/activities/ActivityDetailsModal'
import AddRtmModal from '../components/activities/AddRtmModal'
import PlanExportButton from '../components/activities/PlanExportButton'
import ActivitiesTable from '../components/activities/ActivitiesTable'
import WorkflowBar from '../components/activities/WorkflowBar'
import ActivityDocumentsModal from '../components/activities/ActivityDocumentsModal'
import ProjectPicker from '../components/common/ProjectPicker'
import PreventMutation from '../components/common/PreventMutation'
import { isSpecReadOnlyRole, useActiveRoleName } from '../components/common/RoleGuard'
import { ROLES } from '../utility/Config.jsx'
import api from '../lib/axios'
import { submitPlanForReview } from '../api/planner'
import {
  getMissingRequiredDocumentTypes,
  normalizeProjectDocumentUploads,
  REQUIRED_PROJECT_DOCUMENT_TYPES,
} from '../lib/projectDocuments'
import {
  fetchAuthorizedFileUrl,
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

function ImplementationPlanPage({
  embedded = false,
  toolbarContainer = null,
  projectId: projectIdProp = null,
  onActivityReview = null,
  onProjectChanged = null,
  shouldShowActivityReview = null,
  simplifiedPlannerView = false,
  hideExpectedDeliverable = false,
  hideReapprovalNotice = false,
} = {}) {
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
  const [missingProjectDocTypes, setMissingProjectDocTypes] = useState([])
  const [editActivityDocs, setEditActivityDocs] = useState([])
  const [editActivityDocsLoading, setEditActivityDocsLoading] = useState(false)
  const [detailsTarget, setDetailsTarget] = useState(null)
  const [detailsDocs, setDetailsDocs] = useState([])
  const [detailsDocsLoading, setDetailsDocsLoading] = useState(false)
  const [rtmModalOpen, setRtmModalOpen] = useState(false)

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

  const refreshMissingProjectDocs = useCallback(
    async (id) => {
      if (!id) {
        setMissingProjectDocTypes([])
        return
      }
      try {
        const response = await api.get(`/projects/${id}/documents`)
        const docs = unwrapList(response.data).filter((doc) => doc.is_current !== false)
        const requiredTypes = workflow?.required_document_types || REQUIRED_PROJECT_DOCUMENT_TYPES
        setMissingProjectDocTypes(getMissingRequiredDocumentTypes(docs, requiredTypes))
      } catch {
        setMissingProjectDocTypes([])
      }
    },
    [workflow],
  )

  useEffect(() => {
    if (formTarget !== null) {
      refreshMissingProjectDocs(projectId)
    }
  }, [formTarget, projectId, refreshMissingProjectDocs])

  const resolveEmbeddedProjectId = useCallback(() => {
    if (projectIdProp) return projectIdProp
    const fromRoute = Number(routeId)
    return Number.isFinite(fromRoute) && fromRoute > 0 ? fromRoute : null
  }, [projectIdProp, routeId])

  const loadProjectsAndUsers = useCallback(async () => {
    try {
      // Embedded workspace already knows the project — skip the heavy GET /projects list.
      if (embedded) {
        const embeddedId = resolveEmbeddedProjectId()
        if (embeddedId) {
          storeProjectId(embeddedId)
          setProjectId(embeddedId)
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
  }, [routeId, embedded, resolveEmbeddedProjectId])

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
    if (!projectIdProp) return
    storeProjectId(projectIdProp)
    setProjectId((current) => (current === projectIdProp ? current : projectIdProp))
  }, [projectIdProp])

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

  const tryAutoSubmitPlan = async (id) => {
    await submitPlanForReview(id)
    await loadActivities(id)
    onProjectChanged?.()
  }

  const handleSaveForm = async (values) => {
    const { documents, projectDocuments, ...activityValues } = values
    const isEdit = formTarget?.id != null
    try {
      if (formTarget.id == null) {
        const response = await api.post('/activities', { ...activityValues, project_id: projectId })
        const created = unwrapItem(response.data)
        setActivities((prev) => [...prev, created])
        if (documents?.length) {
          for (const file of documents) {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('project_id', projectId)
            formData.append('activity_id', created.id)
            await api.post('/documents', formData)
          }
        }
        for (const [documentType, files] of Object.entries(normalizeProjectDocumentUploads(projectDocuments || {}))) {
          for (const file of files) {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('project_id', projectId)
            formData.append('document_type', documentType)
            await api.post('/documents', formData)
          }
        }
      } else {
        const response = await api.put(`/activities/${formTarget.id}`, activityValues)
        const updated = unwrapItem(response.data)
        setActivities((prev) => prev.map((activity) => (activity.id === updated.id ? updated : activity)))
        if (documents?.length) {
          for (const file of documents) {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('project_id', projectId)
            formData.append('activity_id', updated.id)
            await api.post('/documents', formData)
          }
        }
        for (const [documentType, files] of Object.entries(normalizeProjectDocumentUploads(projectDocuments || {}))) {
          for (const file of files) {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('project_id', projectId)
            formData.append('document_type', documentType)
            await api.post('/documents', formData)
          }
        }
      }

      const docsRes = await api.get(`/projects/${projectId}/documents`)
      const docs = unwrapList(docsRes.data).filter((doc) => doc.is_current !== false)
      const requiredTypes = workflow?.required_document_types || REQUIRED_PROJECT_DOCUMENT_TYPES
      const missing = getMissingRequiredDocumentTypes(docs, requiredTypes)
      await loadWorkflow(projectId)

      if (!isEdit) {
        if (missing.length > 0) {
          Modal.warning({
            title: 'Missing required project documents',
            content: `Attach these project-level documents before the plan can be submitted: ${missing.join(', ')}.`,
          })
          message.success('Activity added')
        } else if (['draft', 'changes_requested'].includes(workflow?.plan_review_status || '')) {
          await tryAutoSubmitPlan(projectId)
          message.success('Activity added and plan submitted for reviewer approval.')
        } else {
          message.success('Activity added')
        }
      } else if (missing.length > 0) {
        Modal.warning({
          title: 'Missing required project documents',
          content: `Attach these project-level documents before the plan can be submitted: ${missing.join(', ')}.`,
        })
        message.success('Changes saved')
      } else if (['draft', 'changes_requested'].includes(workflow?.plan_review_status || '')) {
        await tryAutoSubmitPlan(projectId)
        message.success('Changes saved and plan submitted for reviewer approval.')
      } else {
        message.success('Changes saved')
      }

      setFormTarget(null)
      onProjectChanged?.()
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
    if (onActivityReview) {
      onActivityReview(activity)
      return
    }
    setReviewTarget(activity)
    await loadReviewHistory(activity.id)
  }

  const openEdit = (activity) => {
    setFormTarget(activity)
    setEditActivityDocs([])
    setEditActivityDocsLoading(true)
    api
      .get(`/projects/${projectId}/documents`, { params: { activity_id: activity.id } })
      .then((response) => setEditActivityDocs(unwrapList(response.data)))
      .catch(() => setEditActivityDocs([]))
      .finally(() => setEditActivityDocsLoading(false))
  }

  const viewActivityDocument = async (doc) => {
    try {
      const url = await fetchAuthorizedFileUrl(doc.id)
      window.open(url, '_blank', 'noopener')
    } catch {
      message.error('Could not open document.')
    }
  }

  const downloadActivityDocument = async (doc) => {
    try {
      const url = await fetchAuthorizedFileUrl(doc.id)
      const link = document.createElement('a')
      link.href = url
      link.download = doc.file_name || 'document'
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      message.error('Could not download document.')
    }
  }

  // The activity's own "planned" fields become directly editable once the
  // whole plan has been returned — otherwise View opens a read-only popup
  // with an explicit Update action.
  const openDetails = (activity) => {
    if (workflow?.plan_review_status === 'changes_requested') {
      openEdit(activity)
      return
    }
    setDetailsTarget(activity)
    setDetailsDocs([])
    setDetailsDocsLoading(true)
    api
      .get(`/projects/${projectId}/documents`, { params: { activity_id: activity.id } })
      .then((response) => setDetailsDocs(unwrapList(response.data)))
      .catch(() => setDetailsDocs([]))
      .finally(() => setDetailsDocsLoading(false))
  }

  const openUpdateFromDetails = () => {
    const activity = detailsTarget
    setDetailsTarget(null)
    if (activity) openEdit(activity)
  }

  const openRtmFromDetails = () => {
    setDetailsTarget(null)
    setRtmModalOpen(true)
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
    <div className="flex flex-col gap-3">
      {toolbarContainer ? (
        createPortal(toolbar, toolbarContainer)
      ) : (
        <div className="flex w-full flex-wrap items-center justify-end gap-3">{toolbar}</div>
      )}

      <WorkflowBar projectId={projectId} workflow={workflow} hideReapprovalNotice={hideReapprovalNotice} />

      {error && <Alert type="error" showIcon message={error} />}

      <Spin spinning={loading}>
        <ActivitiesTable
          activities={activities}
          visibleActivities={visibleActivities}
          filteredInfo={filteredInfo}
          onTableChange={(_pagination, filters) => setFilteredInfo(filters)}
          onReview={openReview}
          onEdit={!simplifiedPlannerView && canAddActivity ? openEdit : null}
          onView={simplifiedPlannerView ? openDetails : null}
          editDisabled={!projectId || planStatus === 'pending_review'}
          hideExpectedDeliverable={hideExpectedDeliverable}
          useApprovalStatus={simplifiedPlannerView || hideExpectedDeliverable}
          planReviewStatus={workflow?.plan_review_status}
          people={people}
          forceShowActions={Boolean(onActivityReview)}
          shouldShowReview={shouldShowActivityReview}
        />
      </Spin>

      <ActivityFormModal
        open={formTarget !== null}
        activity={formTarget}
        people={people}
        requiredProjectDocTypes={missingProjectDocTypes}
        activityDocuments={editActivityDocs}
        activityDocumentsLoading={editActivityDocsLoading}
        onViewDocument={viewActivityDocument}
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
      <ActivityDetailsModal
        open={detailsTarget !== null}
        activity={detailsTarget}
        people={people}
        documents={detailsDocs}
        documentsLoading={detailsDocsLoading}
        canAddRtm={Boolean(workflow?.recommended_at)}
        onClose={() => setDetailsTarget(null)}
        onUpdate={openUpdateFromDetails}
        onAddRtm={openRtmFromDetails}
        onViewDocument={viewActivityDocument}
        onDownloadDocument={downloadActivityDocument}
      />
      <AddRtmModal
        open={rtmModalOpen}
        projectId={projectId}
        onClose={() => setRtmModalOpen(false)}
        onAdded={() => onProjectChanged?.()}
      />
    </div>
  )
}

export default ImplementationPlanPage
