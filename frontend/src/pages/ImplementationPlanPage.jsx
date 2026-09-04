import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useSearchParams } from 'react-router-dom'
import { message, Modal, Space, Spin, Alert, Button, Table, Tag, Descriptions, Form, Input } from 'antd'
import { PlusOutlined, RollbackOutlined } from '@ant-design/icons'
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
import RequirementProgressModal from '../components/matrix/RequirementProgressModal'
import TestScoreModal from '../components/matrix/TestScoreModal'
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
  apiTestResultToUi,
  fetchAuthorizedFileUrl,
  getStoredProjectId,
  storeProjectId,
  uiTestResultToApi,
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
  const [savingActivity, setSavingActivity] = useState(false)
  const [editActivityDocs, setEditActivityDocs] = useState([])
  const [editActivityDocsLoading, setEditActivityDocsLoading] = useState(false)
  const [detailsTarget, setDetailsTarget] = useState(null)
  const [detailsDocs, setDetailsDocs] = useState([])
  const [detailsDocsLoading, setDetailsDocsLoading] = useState(false)
  const [rtmModalOpen, setRtmModalOpen] = useState(false)
  const [requirements, setRequirements] = useState([])
  const [requirementsLoading, setRequirementsLoading] = useState(false)
  const [rtmViewTarget, setRtmViewTarget] = useState(null)
  const [rtmSaving, setRtmSaving] = useState(false)
  const [rtmProgressTarget, setRtmProgressTarget] = useState(null)
  const [rtmTestTarget, setRtmTestTarget] = useState(null)
  const [returnMatrixOpen, setReturnMatrixOpen] = useState(false)
  const [returnMatrixForm] = Form.useForm()

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

  const loadRequirements = useCallback(async (id) => {
    if (!id) {
      setRequirements([])
      return
    }
    setRequirementsLoading(true)
    try {
      const response = await api.get(`/projects/${id}/requirements`)
      setRequirements(unwrapList(response.data))
    } catch {
      setRequirements([])
    } finally {
      setRequirementsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjectsAndUsers()
  }, [loadProjectsAndUsers])

  useEffect(() => {
    if (simplifiedPlannerView) loadRequirements(projectId)
  }, [projectId, simplifiedPlannerView, loadRequirements])

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

  // Uploads a batch of files in parallel instead of one request at a time —
  // with several attachments the sequential version could add many seconds
  // of pure network round-trip time before anything else could happen.
  const uploadDocuments = (files, extraFields) =>
    Promise.all(
      files.map((file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('project_id', projectId)
        Object.entries(extraFields).forEach(([key, value]) => formData.append(key, value))
        return api.post('/documents', formData)
      }),
    )

  const handleSaveForm = async (values) => {
    const { documents, projectDocuments, ...activityValues } = values
    const isEdit = formTarget?.id != null

    setSavingActivity(true)
    let activityRecord
    try {
      if (!isEdit) {
        const response = await api.post('/activities', { ...activityValues, project_id: projectId })
        activityRecord = unwrapItem(response.data)
        setActivities((prev) => [...prev, activityRecord])
      } else {
        const response = await api.put(`/activities/${formTarget.id}`, activityValues)
        activityRecord = unwrapItem(response.data)
        setActivities((prev) => prev.map((activity) => (activity.id === activityRecord.id ? activityRecord : activity)))
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not save activity.')
      setSavingActivity(false)
      return
    }

    // The activity itself is saved — close the popup now rather than making
    // the user stare at it through every follow-up request below. Anything
    // that fails from here on still surfaces as a toast.
    setSavingActivity(false)
    setFormTarget(null)
    message.success(isEdit ? 'Changes saved' : 'Activity added')

    try {
      const uploadTasks = []
      if (documents?.length) {
        uploadTasks.push(uploadDocuments(documents, { activity_id: activityRecord.id }))
      }
      for (const [documentType, files] of Object.entries(normalizeProjectDocumentUploads(projectDocuments || {}))) {
        if (files.length) {
          uploadTasks.push(uploadDocuments(files, { document_type: documentType }))
        }
      }
      if (uploadTasks.length) {
        await Promise.all(uploadTasks)
      }

      const [docsRes] = await Promise.all([
        api.get(`/projects/${projectId}/documents`),
        loadWorkflow(projectId),
      ])
      const docs = unwrapList(docsRes.data).filter((doc) => doc.is_current !== false)
      const requiredTypes = workflow?.required_document_types || REQUIRED_PROJECT_DOCUMENT_TYPES
      const missing = getMissingRequiredDocumentTypes(docs, requiredTypes)

      if (missing.length > 0) {
        Modal.warning({
          title: 'Missing required project documents',
          content: `Attach these project-level documents before the plan can be submitted: ${missing.join(', ')}.`,
        })
      } else if (['draft', 'changes_requested'].includes(workflow?.plan_review_status || '')) {
        await tryAutoSubmitPlan(projectId)
        message.success('Plan submitted for reviewer approval.')
      }

      onProjectChanged?.()
    } catch (err) {
      message.error(err.response?.data?.message || 'Activity saved, but a follow-up step failed.')
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
  const canAddRtm = Boolean(workflow?.recommended_at) && canAddActivity
  const canReviewRtm = Boolean(workflow?.recommended_at) && (roleName === ROLES.PRV || roleName === ROLES.PAD)
  const canUpdateRtmProgress = Boolean(workflow?.recommended_at) && !isSpecReadOnlyRole(roleName)

  const reviewRequirement = async (id, review_decision) => {
    setRtmSaving(true)
    try {
      await api.patch(`/requirements/${id}/review`, { review_decision })
      message.success(review_decision === 'approved' ? 'Requirement approved' : 'Requirement rejected')
      setRtmViewTarget(null)
      await loadRequirements(projectId)
      onProjectChanged?.()
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not save review decision.')
    } finally {
      setRtmSaving(false)
    }
  }

  const startRequirement = async ({ actual_start_date, remark }) => {
    try {
      await api.patch(`/requirements/${rtmProgressTarget.id}/status`, {
        actual_start_date,
        remarks: remark,
      })
      message.success('Requirement started')
      setRtmProgressTarget(null)
      await loadRequirements(projectId)
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not save.')
    }
  }

  const markRequirementComplete = async (requirement) => {
    try {
      await api.patch(`/requirements/${requirement.id}/status`, {
        actual_end_date: dayjs().format('YYYY-MM-DD'),
        remarks: 'Requirement marked complete.',
      })
      message.success('Requirement marked complete')
      setRtmViewTarget(null)
      await loadRequirements(projectId)
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not mark complete.')
    }
  }

  const saveRequirementTestResult = async ({ test_result, test_comments }) => {
    try {
      await api.patch(`/requirements/${rtmTestTarget.id}/status`, {
        implementation_status: rtmTestTarget.implementation_status || 'Pending',
        test_result: uiTestResultToApi(test_result),
        remarks: test_comments,
      })
      message.success('Test result saved')
      setRtmTestTarget(null)
      await loadRequirements(projectId)
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not save test result.')
    }
  }

  const submitReturnMatrix = () => {
    returnMatrixForm.validateFields().then(async (values) => {
      try {
        await api.post(`/projects/${projectId}/matrix/return`, { comment: values.comment.trim() })
        message.success('Matrix returned to planner')
        returnMatrixForm.resetFields()
        setReturnMatrixOpen(false)
        await loadRequirements(projectId)
        onProjectChanged?.()
      } catch (err) {
        message.error(err.response?.data?.message || 'Could not return matrix.')
      }
    })
  }

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

      {simplifiedPlannerView && (canAddRtm || requirements.length > 0) && (
        <div className="mt-2">
          <div className="mb-2" style={{ color: '#800000', fontWeight: 800 }}>
            RTM Requirements
          </div>

          {requirementsLoading ? (
            <Spin size="small" />
          ) : (
            requirements.length > 0 && (
              <Table
                className="mb-3"
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={requirements}
                locale={{ emptyText: 'No requirements added yet.' }}
                columns={[
                  { title: 'SN', width: 56, align: 'center', render: (_, __, index) => index + 1 },
                  { title: 'Code', dataIndex: 'requirement_code' },
                  { title: 'Description', dataIndex: 'description' },
                  {
                    title: 'Status',
                    dataIndex: 'implementation_status',
                    width: 130,
                    render: (value) => <Tag>{value || 'Pending'}</Tag>,
                  },
                  {
                    title: 'Review decision',
                    dataIndex: 'review_decision',
                    width: 140,
                    render: (value) =>
                      value ? (
                        <Tag color={value === 'approved' ? 'green' : value === 'rejected' ? 'red' : 'gold'}>
                          {value.replace('_', ' ')}
                        </Tag>
                      ) : (
                        <Tag>Not reviewed</Tag>
                      ),
                  },
                  {
                    title: 'Action',
                    width: 90,
                    render: (_, record) => (
                      <Button size="small" onClick={() => setRtmViewTarget(record)}>
                        View
                      </Button>
                    ),
                  },
                ]}
              />
            )
          )}

          {(canAddRtm || canReviewRtm) && (
            <div className="flex justify-end gap-2">
              {canAddRtm && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  style={{ backgroundColor: '#7A0C22', borderColor: '#7A0C22' }}
                  onClick={() => setRtmModalOpen(true)}
                >
                  Add requirement
                </Button>
              )}
              {canReviewRtm && (
                <Button icon={<RollbackOutlined />} onClick={() => setReturnMatrixOpen(true)}>
                  Return matrix with comments
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <ActivityFormModal
        open={formTarget !== null}
        activity={formTarget}
        people={people}
        requiredProjectDocTypes={missingProjectDocTypes}
        activityDocuments={editActivityDocs}
        activityDocumentsLoading={editActivityDocsLoading}
        saving={savingActivity}
        returnedComment={
          workflow?.plan_review_status === 'changes_requested' ? workflow?.plan_review_comment : null
        }
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
        onClose={() => setDetailsTarget(null)}
        onUpdate={canAddActivity ? openUpdateFromDetails : null}
        onViewDocument={viewActivityDocument}
        onDownloadDocument={downloadActivityDocument}
      />
      <AddRtmModal
        open={rtmModalOpen}
        projectId={projectId}
        onClose={() => setRtmModalOpen(false)}
        onAdded={() => {
          loadRequirements(projectId)
          onProjectChanged?.()
        }}
      />

      <Modal
        title={<span style={{ color: '#800000', fontWeight: 700 }}>Requirement details</span>}
        open={rtmViewTarget !== null}
        onCancel={() => setRtmViewTarget(null)}
        destroyOnHidden
        width={760}
        footer={
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }}>
            {canReviewRtm && !rtmViewTarget?.review_decision && (
              <>
                <Button
                  type="primary"
                  style={{ backgroundColor: '#7A0C22', borderColor: '#7A0C22' }}
                  loading={rtmSaving}
                  onClick={() => rtmViewTarget && reviewRequirement(rtmViewTarget.id, 'approved')}
                >
                  Approve
                </Button>
                <Button
                  danger
                  loading={rtmSaving}
                  onClick={() => rtmViewTarget && reviewRequirement(rtmViewTarget.id, 'rejected')}
                >
                  Reject
                </Button>
              </>
            )}
            {canUpdateRtmProgress && rtmViewTarget?.review_decision && !rtmViewTarget?.actual_start_date && (
              <Button
                onClick={() => {
                  setRtmProgressTarget(rtmViewTarget)
                  setRtmViewTarget(null)
                }}
              >
                Start
              </Button>
            )}
            {canUpdateRtmProgress &&
              rtmViewTarget?.review_decision &&
              rtmViewTarget?.actual_start_date &&
              !rtmViewTarget?.actual_end_date && (
                <Button onClick={() => markRequirementComplete(rtmViewTarget)}>Mark complete</Button>
              )}
            {canUpdateRtmProgress &&
              rtmViewTarget?.review_decision &&
              rtmViewTarget?.actual_end_date &&
              !rtmViewTarget?.test_result && (
                <Button
                  onClick={() => {
                    setRtmTestTarget(rtmViewTarget)
                    setRtmViewTarget(null)
                  }}
                >
                  Record test result
                </Button>
              )}
            <Button onClick={() => setRtmViewTarget(null)}>Close</Button>
          </div>
        }
      >
        {rtmViewTarget && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Code">{rtmViewTarget.requirement_code}</Descriptions.Item>
            <Descriptions.Item label="Description">{rtmViewTarget.description}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag>{rtmViewTarget.implementation_status || 'Pending'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Review decision">
              {rtmViewTarget.review_decision ? (
                <Tag
                  color={
                    rtmViewTarget.review_decision === 'approved'
                      ? 'green'
                      : rtmViewTarget.review_decision === 'rejected'
                        ? 'red'
                        : 'gold'
                  }
                >
                  {rtmViewTarget.review_decision.replace('_', ' ')}
                </Tag>
              ) : (
                <Tag>Not reviewed</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Remarks">{rtmViewTarget.remarks || '—'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <RequirementProgressModal
        open={rtmProgressTarget !== null}
        requirement={rtmProgressTarget}
        plannedStartDate={projects.find((project) => project.id === projectId)?.planned_start_date}
        onCancel={() => setRtmProgressTarget(null)}
        onSave={startRequirement}
      />

      <TestScoreModal
        open={rtmTestTarget !== null}
        requirement={
          rtmTestTarget ? { ...rtmTestTarget, test_result: apiTestResultToUi(rtmTestTarget.test_result) } : null
        }
        onCancel={() => setRtmTestTarget(null)}
        onSave={saveRequirementTestResult}
      />

      <Modal
        title="Return matrix with comments"
        open={returnMatrixOpen}
        onOk={submitReturnMatrix}
        onCancel={() => {
          returnMatrixForm.resetFields()
          setReturnMatrixOpen(false)
        }}
        okText="Return matrix"
        footer={(_, { OkBtn, CancelBtn }) => (
          <>
            <OkBtn />
            <CancelBtn />
          </>
        )}
        destroyOnHidden
      >
        <p className="mb-3 text-sm text-gray-600">
          This marks every requirement in the matrix as needing revision and records your comment for the team.
        </p>
        <Form form={returnMatrixForm} layout="vertical">
          <Form.Item
            name="comment"
            label="Comment"
            rules={[{ required: true, message: 'Add a comment explaining the return' }]}
          >
            <Input.TextArea rows={3} placeholder="What needs to change before this matrix can be approved?" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ImplementationPlanPage
