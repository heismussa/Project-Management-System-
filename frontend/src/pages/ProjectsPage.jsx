import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Upload,
  message,
} from 'antd'
import { CloseCircleOutlined, DownloadOutlined, EyeOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { Search } from 'lucide-react'
import api from '../lib/axios'
import { fetchAuthorizedFileUrl, unwrapItem, unwrapList } from '../lib/apiHelpers'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../utility/Config.jsx'
import { deriveStatus } from '../lib/status'
import { formatDate } from '../lib/dates'
import ActivityFormModal from '../components/activities/ActivityFormModal'
import InitiationDocumentsPanel from '../components/projects/InitiationDocumentsPanel'
import ClosurePanel from '../components/projects/ClosurePanel'

const REQUIRED_DOCUMENT_TYPES = ['Implementation Plan', 'SRS']

const BLANK_ACTIVITY = {
  id: null,
  name: '',
  expected_deliverable: '',
  planned_start_date: null,
  planned_end_date: null,
  responsible_person_id: null,
}

const DERIVED_STATUS_LABELS = { not_started: 'Not started', ongoing: 'Ongoing', completed: 'Completed' }
const LIFECYCLE_STAGE_LABELS = { initiation: 'Initiation', planning: 'Planning', execution: 'Execution', closure: 'Closure' }

const STATUS_COLOR = {
  Initiated: 'default',
  'Plan Submitted': 'gold',
  'Plan Returned': 'orange',
  'Plan Approved': 'green',
  'In Execution': 'blue',
  Closed: 'red',
}

// Display-only relabeling — the stored status value stays "Plan Submitted"
// (other logic keys off it); reviewers just read it as "Pending Review".
const STATUS_LABEL = {
  'Plan Submitted': 'Pending Review',
}

function statusLabel(status) {
  return STATUS_LABEL[status] || status || '—'
}

function hasPermission(user, code) {
  return (user?.permissions || []).includes(code)
}

function isAssignedToPlanner(project, user) {
  if (!user) return false
  if (project.planner_id != null && Number(project.planner_id) === Number(user.id)) return true
  const userName = user.name || user.full_name
  if (userName && project.planner?.name === userName) return true
  return false
}

export function isCompletedProject(project) {
  return Boolean(project?.closed_at) || project?.status === 'Closed'
}

function ProjectsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, activeRole } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState(() => searchParams.get('q') || '')
  const derivedStatusFilter = searchParams.get('derivedStatus')
  const lifecycleStageFilter = searchParams.get('lifecycleStage')
  const view = searchParams.get('view') === 'completed' ? 'completed' : 'ongoing'
  const [reassignTarget, setReassignTarget] = useState(null)
  const [detailTarget, setDetailTarget] = useState(null)
  const [detailDownloading, setDetailDownloading] = useState(false)
  const [detailDocuments, setDetailDocuments] = useState([])
  const [detailDocumentsLoading, setDetailDocumentsLoading] = useState(false)
  const [detailActivities, setDetailActivities] = useState([])
  const [detailActivitiesLoading, setDetailActivitiesLoading] = useState(false)
  const [activityFormTarget, setActivityFormTarget] = useState(null)
  const [savingActivity, setSavingActivity] = useState(false)
  const [planningBlockers, setPlanningBlockers] = useState(null)
  const [detailWorkflow, setDetailWorkflow] = useState(null)
  const [activityReviewTarget, setActivityReviewTarget] = useState(null)
  const [activityReviewDocs, setActivityReviewDocs] = useState([])
  const [activityReviewDocsLoading, setActivityReviewDocsLoading] = useState(false)
  const [activityReviewComment, setActivityReviewComment] = useState('')
  const [isRejectingActivity, setIsRejectingActivity] = useState(false)
  const [activityRejectReason, setActivityRejectReason] = useState('')
  const [activityReviewSaving, setActivityReviewSaving] = useState(false)
  const [planReviewComment, setPlanReviewComment] = useState('')
  const [planReviewSaving, setPlanReviewSaving] = useState(false)
  const [activityProgressTarget, setActivityProgressTarget] = useState(null)
  const [activityProgressDocs, setActivityProgressDocs] = useState([])
  const [activityProgressDocsLoading, setActivityProgressDocsLoading] = useState(false)
  const [activityProgressHistory, setActivityProgressHistory] = useState([])
  const [progressActualStart, setProgressActualStart] = useState(null)
  const [progressRemark, setProgressRemark] = useState('')
  const [progressSaving, setProgressSaving] = useState(false)
  const [progressUploading, setProgressUploading] = useState(false)
  const [documentReviewTarget, setDocumentReviewTarget] = useState(null)
  const [documentReviewComment, setDocumentReviewComment] = useState('')
  const [documentReviewSaving, setDocumentReviewSaving] = useState(false)
  const [actionsOpenId, setActionsOpenId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const isPlannerRole = activeRole?.name === ROLES.PPL
  const isReviewerRole = activeRole?.name === ROLES.PRV
  const canReassign =
    hasPermission(user, 'projects.assign_planner') || hasPermission(user, 'projects.reassign_planner')
  const isCompletedView = view === 'completed'
  const canRegister =
    activeRole?.name !== ROLES.PPL &&
    (activeRole?.name === ROLES.PRV || activeRole?.name === ROLES.PAD) &&
    hasPermission(user, 'projects.register')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const projectParams = {}
      if (isPlannerRole && user?.id) {
        projectParams.planner_id = user.id
        projectParams.role = ROLES.PPL
      }

      const projectsRes = await api.get('/projects', { params: projectParams })

      let list = unwrapList(projectsRes.data)
      if (isPlannerRole && user) {
        list = list.filter((project) => isAssignedToPlanner(project, user))
      }

      setProjects(list)
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not load projects.')
    } finally {
      setLoading(false)
    }
  }, [isPlannerRole, user])

  const loadUsersForReassign = useCallback(async () => {
    if (users.length) return
    try {
      const usersRes = await api.get('/users')
      setUsers(unwrapList(usersRes.data))
    } catch {
      message.error('Could not load planners.')
    }
  }, [users.length])

  useEffect(() => {
    load()
  }, [load])

  // After Register project → land on Ongoing list, toast, and refresh.
  useEffect(() => {
    const flashName = location.state?.registeredProjectName
    const flashId = location.state?.registeredProjectId
    if (!flashName && !flashId) return

    if (searchParams.get('view') === 'completed') {
      const next = new URLSearchParams(searchParams)
      next.delete('view')
      setSearchParams(next, { replace: true })
    }

    if (flashName) {
      message.success(`Project "${flashName}" registered successfully`)
    }

    navigate(location.pathname + location.search, { replace: true, state: {} })
    // load() already runs on mount; only refresh if we replaced state after mount.
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot flash from navigation state
  }, [location.state])

  const planners = useMemo(() => {
    const filtered = users.filter((item) =>
      (item.roles || []).some((role) => role.name === ROLES.PPL),
    )
    return filtered.length ? filtered : users
  }, [users])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return projects.filter((project) => {
      const completed = isCompletedProject(project)
      if (isCompletedView && !completed) return false
      if (!isCompletedView && completed) return false
      if (derivedStatusFilter && deriveStatus(project) !== derivedStatusFilter) return false
      if (lifecycleStageFilter && project.lifecycle_stage !== lifecycleStageFilter) return false
      if (!term) return true
      return [project.name, project.category, project.project_type, project.status, project.phase, project.planner?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [projects, search, derivedStatusFilter, lifecycleStageFilter, isCompletedView])

  const clearStructuredFilter = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('derivedStatus')
    next.delete('lifecycleStage')
    setSearchParams(next, { replace: true })
  }

  const loadDetailWorkflow = (projectId) => {
    api
      .get(`/projects/${projectId}/workflow`)
      .then((response) => setDetailWorkflow(unwrapItem(response.data)))
      .catch(() => setDetailWorkflow(null))
  }

  const loadDetailDocuments = (projectId) => {
    setDetailDocumentsLoading(true)
    return api
      .get(`/projects/${projectId}/documents`)
      .then((response) => {
        setDetailDocuments(unwrapList(response.data).filter((doc) => doc.is_current !== false))
      })
      .catch(() => {
        setDetailDocuments([])
        message.error('Could not load project documents.')
      })
      .finally(() => {
        setDetailDocumentsLoading(false)
      })
  }

  const openDetail = (record) => {
    setActionsOpenId(null)
    setDetailTarget(record)
    setPlanReviewComment('')
    setDetailWorkflow(null)
    loadDetailWorkflow(record.id)

    setDetailDocuments([])
    loadDetailDocuments(record.id)

    setDetailActivities([])
    setDetailActivitiesLoading(true)
    api
      .get(`/projects/${record.id}/activities`)
      .then((response) => {
        setDetailActivities(unwrapList(response.data))
      })
      .catch(() => {
        setDetailActivities([])
      })
      .finally(() => {
        setDetailActivitiesLoading(false)
      })

    setPlanningBlockers(null)
    if (record.lifecycle_stage === 'initiation') {
      api
        .get(`/projects/${record.id}/initiation-readiness`)
        .then((response) => {
          const readiness = unwrapItem(response.data)
          setPlanningBlockers(readiness?.ready ? [] : readiness?.blockers || [])
        })
        .catch(() => setPlanningBlockers(null))
    }

    if (isPlannerRole) {
      loadUsersForReassign()
    }
  }

  const openReassign = (record) => {
    setActionsOpenId(null)
    setReassignTarget(record)
    form.setFieldsValue({ planner_id: record.planner_id })
    loadUsersForReassign()
  }

  const downloadProjectFiles = async (record) => {
    setDetailDownloading(true)
    try {
      const response = await api.get(`/projects/${record.id}/documents`)
      const documents = unwrapList(response.data).filter((doc) => doc.is_current !== false)
      if (!documents.length) {
        message.info('No documents available to download for this project.')
        return
      }
      for (const doc of documents) {
        const url = await fetchAuthorizedFileUrl(doc.id)
        const link = document.createElement('a')
        link.href = url
        link.download = doc.file_name || `project-${record.id}-document`
        link.click()
        URL.revokeObjectURL(url)
      }
      message.success(documents.length === 1 ? 'File downloaded.' : `${documents.length} files downloaded.`)
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not download files.')
    } finally {
      setDetailDownloading(false)
    }
  }

  // Opens the file inline in a new tab (blob URL) so the reviewer/planner can
  // keep working in the original tab; the browser's own viewer supplies a
  // download control instead of forcing an attachment download here.
  const viewDocument = async (doc) => {
    try {
      const url = await fetchAuthorizedFileUrl(doc.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      message.error('Could not open document.')
    }
  }

  const downloadSingleDocument = async (doc) => {
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

  const handleSaveActivity = async (values) => {
    if (!detailTarget) return
    const { rtm_requirement, rtm_comment, documents, projectDocuments, ...activityValues } = values
    setSavingActivity(true)
    try {
      const response = await api.post('/activities', { ...activityValues, project_id: detailTarget.id })
      const created = unwrapItem(response.data)
      setDetailActivities((prev) => [...prev, created])

      if (rtm_requirement?.trim()) {
        await api.post('/requirements', {
          project_id: detailTarget.id,
          requirement_code: `RTM-${created.id}`,
          description: rtm_requirement.trim(),
          remarks: rtm_comment?.trim() || undefined,
        })
      }

      if (documents?.length) {
        await Promise.all(
          documents.map((file) => {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('project_id', detailTarget.id)
            formData.append('activity_id', created.id)
            return api.post('/documents', formData)
          }),
        )
      }

      const projectDocUploads = Object.entries(projectDocuments || {}).flatMap(([documentType, files]) =>
        files.map((file) => {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('project_id', detailTarget.id)
          formData.append('document_type', documentType)
          return api.post('/documents', formData)
        }),
      )
      if (projectDocUploads.length) {
        await Promise.all(projectDocUploads)
        loadDetailDocuments(detailTarget.id)
      }

      message.success('Activity added')
      setActivityFormTarget(null)
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not add activity.')
    } finally {
      setSavingActivity(false)
    }
  }

  const openActivityReview = (activity) => {
    setActivityReviewComment('')
    setActivityRejectReason('')
    setIsRejectingActivity(false)
    setActivityReviewTarget(activity)
    setActivityReviewDocs([])
    setActivityReviewDocsLoading(true)
    api
      .get(`/projects/${activity.project_id}/documents`, { params: { activity_id: activity.id } })
      .then((response) => setActivityReviewDocs(unwrapList(response.data)))
      .catch(() => setActivityReviewDocs([]))
      .finally(() => setActivityReviewDocsLoading(false))
  }

  const closeActivityReview = () => {
    setActivityReviewTarget(null)
    setActivityReviewDocs([])
    setActivityReviewComment('')
    setActivityRejectReason('')
    setIsRejectingActivity(false)
  }

  const submitActivityReview = async (decision) => {
    if (!activityReviewTarget) return

    if (decision === 'reject' && !isRejectingActivity) {
      setIsRejectingActivity(true)
      return
    }

    // A progress update in flight is the only thing routed to the
    // progress-review endpoints; everything else (an explicit 'pending'
    // plan_change_status, or null on an activity created before that field
    // was tracked) goes through plan-changes, which tolerates a missing
    // pending_changes snapshot.
    const kind = activityReviewTarget.progress_review_status === 'pending' ? 'progress-review' : 'plan-changes'
    let payload = {}
    if (decision === 'reject') {
      const reason = activityRejectReason.trim()
      if (!reason) {
        message.error('Please provide a reason for rejecting.')
        return
      }
      payload = { comment: reason }
    } else {
      const comment = activityReviewComment.trim()
      if (comment) payload = { comment }
    }

    setActivityReviewSaving(true)
    try {
      const response = await api.post(`/activities/${activityReviewTarget.id}/${kind}/${decision}`, payload)
      const updated = unwrapItem(response.data)
      setDetailActivities((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      message.success(decision === 'approve' ? 'Activity approved' : 'Activity rejected')
      closeActivityReview()
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not submit the review decision.')
    } finally {
      setActivityReviewSaving(false)
    }
  }

  const submitPlanReview = async (decision) => {
    if (!detailTarget) return
    const comment = planReviewComment.trim()
    if (decision === 'returned' && !comment) {
      message.error('Please provide a comment explaining what needs to change.')
      return
    }

    setPlanReviewSaving(true)
    try {
      const response = await api.post(`/projects/${detailTarget.id}/plan/review`, {
        decision,
        comment: comment || undefined,
      })
      const updated = unwrapItem(response.data)
      setDetailTarget((prev) => (prev ? { ...prev, ...updated } : updated))
      setPlanReviewComment('')
      message.success(decision === 'approved' ? 'Plan approved' : 'Plan returned to the planner')
      load()
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not submit the plan decision.')
    } finally {
      setPlanReviewSaving(false)
    }
  }

  const updateActivityEverywhere = (updated) => {
    setDetailActivities((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    setActivityProgressTarget((prev) => (prev && prev.id === updated.id ? updated : prev))
  }

  const openActivityProgress = (activity) => {
    setActivityProgressTarget(activity)
    setProgressActualStart(activity.actual_start_date ? dayjs(activity.actual_start_date) : null)
    setProgressRemark('')
    setActivityProgressDocs([])
    setActivityProgressDocsLoading(true)
    api
      .get(`/projects/${activity.project_id}/documents`, { params: { activity_id: activity.id } })
      .then((response) => setActivityProgressDocs(unwrapList(response.data)))
      .catch(() => setActivityProgressDocs([]))
      .finally(() => setActivityProgressDocsLoading(false))

    setActivityProgressHistory([])
    api
      .get(`/activities/${activity.id}/progress`)
      .then((response) => setActivityProgressHistory(unwrapList(response.data)))
      .catch(() => setActivityProgressHistory([]))
  }

  const closeActivityProgress = () => {
    setActivityProgressTarget(null)
    setProgressActualStart(null)
    setProgressRemark('')
    setActivityProgressDocs([])
    setActivityProgressHistory([])
  }

  const saveActivityActualStart = async () => {
    if (!activityProgressTarget || !progressActualStart) return
    setProgressSaving(true)
    try {
      const actual_start_date = progressActualStart.format('YYYY-MM-DD')
      const status = deriveStatus({ actual_start_date, actual_end_date: activityProgressTarget.actual_end_date })
      const response = await api.put(`/activities/${activityProgressTarget.id}`, { actual_start_date, status })
      updateActivityEverywhere(unwrapItem(response.data))
      message.success('Actual start saved')
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not save actual start.')
    } finally {
      setProgressSaving(false)
    }
  }

  const markActivityComplete = async () => {
    if (!activityProgressTarget) return
    setProgressSaving(true)
    try {
      const response = await api.put(`/activities/${activityProgressTarget.id}`, {
        actual_end_date: dayjs().format('YYYY-MM-DD'),
        status: 'completed',
        remark: 'Activity marked complete.',
      })
      updateActivityEverywhere(unwrapItem(response.data))
      message.success('Activity marked complete')
      const historyResponse = await api.get(`/activities/${activityProgressTarget.id}/progress`)
      setActivityProgressHistory(unwrapList(historyResponse.data))
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not mark activity complete.')
    } finally {
      setProgressSaving(false)
    }
  }

  const addActivityRemark = async () => {
    if (!activityProgressTarget) return
    const remark = progressRemark.trim()
    if (!remark) return
    setProgressSaving(true)
    try {
      const response = await api.put(`/activities/${activityProgressTarget.id}`, { remark })
      updateActivityEverywhere(unwrapItem(response.data))
      setProgressRemark('')
      message.success('Remark added')
      const historyResponse = await api.get(`/activities/${activityProgressTarget.id}/progress`)
      setActivityProgressHistory(unwrapList(historyResponse.data))
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not add remark.')
    } finally {
      setProgressSaving(false)
    }
  }

  const handleEvidenceUpload = async ({ file, onSuccess, onError }) => {
    if (!activityProgressTarget) return
    setProgressUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('project_id', activityProgressTarget.project_id)
      formData.append('activity_id', activityProgressTarget.id)
      formData.append('document_type', 'Activity Evidence')
      const response = await api.post('/documents', formData)
      onSuccess?.(response.data)
      setActivityProgressDocs((prev) => [...prev, unwrapItem(response.data)])
      message.success('Evidence uploaded')
    } catch (err) {
      onError?.(err)
      message.error(err.response?.data?.message || 'Could not upload evidence.')
    } finally {
      setProgressUploading(false)
    }
  }

  const submitProgressForReview = async () => {
    if (!activityProgressTarget) return
    setProgressSaving(true)
    try {
      const response = await api.post(`/activities/${activityProgressTarget.id}/progress-review/submit`)
      updateActivityEverywhere(unwrapItem(response.data))
      message.success('Progress update submitted to the reviewer')
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not submit for review.')
    } finally {
      setProgressSaving(false)
    }
  }

  const openDocumentReview = (doc) => {
    setDocumentReviewComment('')
    setDocumentReviewTarget(doc)
  }

  const closeDocumentReview = () => {
    setDocumentReviewTarget(null)
    setDocumentReviewComment('')
  }

  const submitDocumentReview = async (decision) => {
    if (!documentReviewTarget || !detailTarget) return
    const comment = documentReviewComment.trim()
    if (decision === 'returned' && !comment) {
      message.error('Please provide a comment explaining what needs to change.')
      return
    }

    setDocumentReviewSaving(true)
    try {
      await api.post(`/documents/${documentReviewTarget.id}/review`, { decision, comment: comment || undefined })
      message.success(decision === 'approved' ? 'Document approved' : 'Document returned to the planner')
      closeDocumentReview()
      loadDetailDocuments(detailTarget.id)
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not submit the document decision.')
    } finally {
      setDocumentReviewSaving(false)
    }
  }

  const submitReassign = async (values) => {
    if (!reassignTarget) return
    setSaving(true)
    try {
      await api.put(`/projects/${reassignTarget.id}/reassign`, { planner_id: values.planner_id })
      message.success('Planner reassigned.')
      setReassignTarget(null)
      form.resetFields()
      await load()
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not reassign planner.')
    } finally {
      setSaving(false)
    }
  }

  const activityBlockers = planningBlockers || []

  // Prefer the backend's own required-document list (workflow payload) so
  // this stays in sync with ProjectWorkflowService::REQUIRED_DOCUMENT_TYPES;
  // the local constant is only a fallback for the moment before the
  // workflow fetch resolves.
  const requiredDocumentTypes = detailWorkflow?.required_document_types || REQUIRED_DOCUMENT_TYPES
  const missingProjectDocTypes = requiredDocumentTypes.filter(
    (type) => !detailDocuments.some((doc) => (doc.document_type || '').toLowerCase() === type.toLowerCase()),
  )

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    },
    {
      title: 'Type',
      dataIndex: 'project_type',
      key: 'project_type',
      ellipsis: true,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    },
    {
      title: 'Phase',
      key: 'phase',
      ellipsis: true,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (_, record) => record.phase || record.workflow?.phase || '—',
    },
    {
      title: 'Planner',
      key: 'planner',
      ellipsis: true,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (_, record) => record.planner?.name || 'Unassigned',
    },
    {
      title: 'Status',
      key: 'status',
      width: 140,
      align: 'left',
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (_, record) => (
        <Tag
          color={STATUS_COLOR[record.status] || 'default'}
          style={{ marginInlineEnd: 0, whiteSpace: 'nowrap' }}
        >
          {statusLabel(record.status)}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: isReviewerRole ? 96 : 80,
      align: 'center',
      fixed: 'right',
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (_, record) => (
        <Button
          size="small"
          aria-label={isReviewerRole ? 'Review project' : 'View project details'}
          style={{
            backgroundColor: '#800000',
            borderColor: '#800000',
            color: '#fff',
            fontWeight: 800,
          }}
          onClick={() => openDetail(record)}
        >
          {isReviewerRole ? 'Review' : 'View'}
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Card className="page-shell-card">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <Tabs
            activeKey={view}
            className="pms-view-tabs !mb-0"
            onChange={(key) => {
              const next = new URLSearchParams(searchParams)
              if (key === 'completed') next.set('view', 'completed')
              else next.delete('view')
              setSearchParams(next, { replace: true })
            }}
            items={[
              { key: 'ongoing', label: 'Ongoing' },
              { key: 'completed', label: 'Completed' },
            ]}
          />
          {canRegister && !isCompletedView && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={{ backgroundColor: '#800000', borderColor: '#800000' }}
              onClick={() => navigate('/projects/create')}
            >
              Register project
            </Button>
          )}
        </div>
        {(derivedStatusFilter || lifecycleStageFilter) && (
          <Tag
            closable
            closeIcon={<CloseCircleOutlined />}
            onClose={clearStructuredFilter}
            color="#962c30"
            className="mb-4"
          >
            Filtered by:{' '}
            {[
              derivedStatusFilter && (DERIVED_STATUS_LABELS[derivedStatusFilter] ?? derivedStatusFilter),
              lifecycleStageFilter && (LIFECYCLE_STAGE_LABELS[lifecycleStageFilter] ?? lifecycleStageFilter),
            ]
              .filter(Boolean)
              .join(' · ')}
          </Tag>
        )}
        <Input
          allowClear
          prefix={<Search className="h-4 w-4 text-gray-400" />}
          placeholder="Search name, category, planner, status"
          className="mb-4 max-w-md"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={{
            emptyText: isCompletedView
              ? 'No completed projects yet.'
              : isPlannerRole
                ? 'No projects assigned to you.'
                : 'No ongoing projects.',
          }}
        />
      </Card>

      <Modal
        title={<span style={{ color: '#800000', fontWeight: 800 }}>Details</span>}
        open={Boolean(detailTarget)}
        onCancel={() => {
          setDetailTarget(null)
          setDetailDocuments([])
          setDetailActivities([])
        }}
        destroyOnHidden
        width={1040}
        centered
        styles={{ body: { maxHeight: '82vh', overflowY: 'auto', paddingRight: 4 } }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Button key="close" type="default" onClick={() => setDetailTarget(null)}>
              Close
            </Button>
          </div>
        }
      >
        {detailTarget && (
          <div>
            <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
              <Descriptions.Item label="Name">{detailTarget.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Category">{detailTarget.category || '—'}</Descriptions.Item>
              <Descriptions.Item label="Type">{detailTarget.project_type || '—'}</Descriptions.Item>
              <Descriptions.Item label="Phase">
                {detailTarget.phase || detailTarget.workflow?.phase || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Planner">
                <span className="inline-flex items-center gap-2">
                  {detailTarget.planner?.name || 'Unassigned'}
                  {isReviewerRole && canReassign && (
                    <Button size="small" type="link" style={{ padding: 0 }} onClick={() => openReassign(detailTarget)}>
                      Reassign
                    </Button>
                  )}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLOR[detailTarget.status] || 'default'}>{statusLabel(detailTarget.status)}</Tag>
              </Descriptions.Item>
            </Descriptions>

            {isReviewerRole && detailTarget.plan_review_status === 'pending_review' && (
              <div className="mt-4 rounded border border-gray-200 p-3">
                <div className="text-sm font-bold" style={{ color: '#800000' }}>
                  Plan Review
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  The planner has submitted the implementation plan for your decision.
                </div>
                <Input.TextArea
                  className="mt-2"
                  rows={2}
                  placeholder="Comment (required if returning)"
                  value={planReviewComment}
                  onChange={(event) => setPlanReviewComment(event.target.value)}
                />
                <Space className="mt-2">
                  <Button danger loading={planReviewSaving} onClick={() => submitPlanReview('returned')}>
                    Return with comments
                  </Button>
                  <Button
                    type="primary"
                    style={{ backgroundColor: '#800000', borderColor: '#800000' }}
                    loading={planReviewSaving}
                    onClick={() => submitPlanReview('approved')}
                  >
                    Approve plan
                  </Button>
                </Space>
              </div>
            )}

            {detailTarget.lifecycle_stage === 'initiation' && canRegister ? (
              <div className="mt-4 rounded border border-gray-200 p-3">
                <InitiationDocumentsPanel
                  projectId={detailTarget.id}
                  onProceeded={() => {
                    setDetailTarget(null)
                    load()
                  }}
                />
              </div>
            ) : (
              <div className="mt-4 rounded border border-gray-200 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-bold" style={{ color: '#800000' }}>
                      Documents
                    </div>
                    <div className="text-xs text-gray-500">{detailDocuments.length} current file(s)</div>
                  </div>
                  {detailDocuments.length > 1 && (
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      type="default"
                      loading={detailDownloading}
                      onClick={() => downloadProjectFiles(detailTarget)}
                    >
                      Download all
                    </Button>
                  )}
                </div>

                {detailDocumentsLoading ? (
                  <div className="mt-2">
                    <Spin size="small" />
                  </div>
                ) : detailDocuments.length > 0 ? (
                  <Table
                    className="mt-2"
                    size="small"
                    rowKey="id"
                    pagination={false}
                    dataSource={detailDocuments}
                    columns={[
                      { title: 'File', dataIndex: 'file_name', key: 'file_name', ellipsis: true },
                      { title: 'Type', dataIndex: 'document_type', key: 'document_type', width: 160 },
                      {
                        title: 'Uploaded',
                        key: 'uploaded_at',
                        width: 130,
                        render: (_, docRecord) => formatDate(docRecord.uploaded_at),
                      },
                      ...(isReviewerRole
                        ? [
                            {
                              title: 'Review',
                              key: 'review_status',
                              width: 110,
                              render: (_, docRecord) => {
                                const status = docRecord.review_status
                                if (status === 'approved') return <Tag color="green">Approved</Tag>
                                if (status === 'returned') return <Tag color="red">Returned</Tag>
                                return <Tag color="gold">Pending</Tag>
                              },
                            },
                          ]
                        : []),
                      {
                        title: 'Actions',
                        key: 'actions',
                        width: isReviewerRole ? 220 : 160,
                        render: (_, docRecord) => (
                          <Space size="small">
                            <Button size="small" icon={<EyeOutlined />} onClick={() => viewDocument(docRecord)}>
                              View
                            </Button>
                            <Button
                              size="small"
                              icon={<DownloadOutlined />}
                              aria-label="Download document"
                              onClick={() => downloadSingleDocument(docRecord)}
                            />
                            {isReviewerRole && docRecord.review_status !== 'approved' && (
                              <Button size="small" onClick={() => openDocumentReview(docRecord)}>
                                Review
                              </Button>
                            )}
                          </Space>
                        ),
                      },
                    ]}
                  />
                ) : (
                  <div className="mt-2 text-sm text-gray-700">No current documents.</div>
                )}
              </div>
            )}

            <div className="mt-4 rounded border border-gray-200 p-3">
              <div className="text-sm font-bold" style={{ color: '#800000' }}>
                Activities
              </div>

              {isPlannerRole && activityBlockers.length > 0 && (
                <Alert
                  className="mt-2"
                  type="warning"
                  showIcon
                  message="Activities can't be added yet"
                  description={
                    <>
                      <div>These need to be resolved first:</div>
                      <ul className="mb-0 mt-1 list-disc pl-5">
                        {activityBlockers.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </>
                  }
                />
              )}

              {detailActivitiesLoading ? (
                <div className="mt-2">
                  <Spin size="small" />
                </div>
              ) : (
                detailActivities.length > 0 && (
                  <Table
                    className="mt-2"
                    size="small"
                    rowKey="id"
                    pagination={false}
                    dataSource={detailActivities}
                    columns={[
                      { title: 'Activity', dataIndex: 'name', key: 'name', ellipsis: true },
                      {
                        title: 'Planned Start',
                        key: 'planned_start_date',
                        render: (_, activityRecord) => formatDate(activityRecord.planned_start_date),
                      },
                      {
                        title: 'Planned End',
                        key: 'planned_end_date',
                        render: (_, activityRecord) => formatDate(activityRecord.planned_end_date),
                      },
                      {
                        title: 'Responsible',
                        key: 'responsible',
                        render: (_, activityRecord) => activityRecord.responsible_person?.name || '—',
                      },
                      ...(isPlannerRole || isReviewerRole
                        ? [
                            {
                              title: 'Status',
                              key: 'reviewStatus',
                              width: 150,
                              render: (_, activityRecord) => {
                                if (activityRecord.progress_review_status === 'pending') {
                                  return <Tag color="gold">Pending</Tag>
                                }
                                if (activityRecord.progress_review_status === 'rejected') {
                                  return <Tag color="red">Rejected</Tag>
                                }
                                if (activityRecord.plan_change_status === 'rejected') {
                                  return <Tag color="red">Rejected</Tag>
                                }
                                if (
                                  activityRecord.plan_change_status === 'approved' ||
                                  activityRecord.progress_review_status === 'approved'
                                ) {
                                  return <Tag color="green">Approved</Tag>
                                }
                                // Covers explicit 'pending' and legacy activities
                                // created before this field existed (null).
                                return <Tag color="gold">Pending</Tag>
                              },
                            },
                            {
                              title: 'Actions',
                              key: 'activityActions',
                              width: 100,
                              render: (_, activityRecord) => {
                                if (isReviewerRole) {
                                  const needsReview =
                                    activityRecord.progress_review_status === 'pending' ||
                                    !['approved', 'rejected'].includes(activityRecord.plan_change_status)
                                  return needsReview ? (
                                    <Button size="small" onClick={() => openActivityReview(activityRecord)}>
                                      Review
                                    </Button>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )
                                }
                                return (
                                  <Button size="small" onClick={() => openActivityProgress(activityRecord)}>
                                    Update
                                  </Button>
                                )
                              },
                            },
                          ]
                        : []),
                    ]}
                  />
                )
              )}

              {isPlannerRole && activityBlockers.length === 0 && (
                <Button
                  className="mt-3"
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  style={{ borderColor: '#800000', color: '#800000', fontWeight: 700 }}
                  onClick={() => setActivityFormTarget(BLANK_ACTIVITY)}
                >
                  Add Activity
                </Button>
              )}
            </div>

            {detailTarget.plan_review_status === 'approved' && (
              <div className="mt-4 rounded border border-gray-200 p-3">
                <div className="mb-2 text-sm font-bold" style={{ color: '#800000' }}>
                  Project Closure
                </div>
                <ClosurePanel
                  projectId={detailTarget.id}
                  workflow={detailWorkflow}
                  onChanged={() => {
                    loadDetailWorkflow(detailTarget.id)
                    load()
                  }}
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      <ActivityFormModal
        open={activityFormTarget !== null}
        activity={activityFormTarget}
        people={users.map((item) => ({ id: item.id, name: item.name }))}
        requiredProjectDocTypes={missingProjectDocTypes}
        saving={savingActivity}
        onCancel={() => setActivityFormTarget(null)}
        onSave={handleSaveActivity}
      />

      <Modal
        title={activityReviewTarget ? `Review activity — ${activityReviewTarget.name}` : 'Review activity'}
        open={Boolean(activityReviewTarget)}
        onCancel={closeActivityReview}
        destroyOnHidden
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {isRejectingActivity ? (
              <>
                <Button onClick={() => setIsRejectingActivity(false)}>Back</Button>
                <Button danger loading={activityReviewSaving} onClick={() => submitActivityReview('reject')}>
                  Confirm reject
                </Button>
              </>
            ) : (
              <>
                <Button onClick={closeActivityReview}>Cancel</Button>
                <Button danger loading={activityReviewSaving} onClick={() => submitActivityReview('reject')}>
                  Reject
                </Button>
                <Button
                  type="primary"
                  style={{ backgroundColor: '#800000', borderColor: '#800000' }}
                  loading={activityReviewSaving}
                  onClick={() => submitActivityReview('approve')}
                >
                  Approve
                </Button>
              </>
            )}
          </div>
        }
      >
        {activityReviewTarget && (
          <div>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Activity">{activityReviewTarget.name}</Descriptions.Item>
              <Descriptions.Item label="Expected Deliverable">
                {activityReviewTarget.expected_deliverable || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Planned Start">
                {formatDate(activityReviewTarget.planned_start_date)}
              </Descriptions.Item>
              <Descriptions.Item label="Planned End">
                {formatDate(activityReviewTarget.planned_end_date)}
              </Descriptions.Item>
              <Descriptions.Item label="Responsible Person">
                {activityReviewTarget.responsible_person?.name || '—'}
              </Descriptions.Item>
              {activityReviewTarget.progress_review_status === 'pending' && (
                <>
                  <Descriptions.Item label="Actual Start">
                    {formatDate(activityReviewTarget.actual_start_date)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Actual End">
                    {formatDate(activityReviewTarget.actual_end_date)}
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="What's pending">
                {activityReviewTarget.progress_review_status === 'pending'
                  ? 'A progress update is awaiting your decision.'
                  : 'This activity is awaiting your decision.'}
              </Descriptions.Item>
            </Descriptions>

            <div className="mt-4">
              <div className="mb-1 text-sm font-semibold">Documents</div>
              {activityReviewDocsLoading ? (
                <Spin size="small" />
              ) : activityReviewDocs.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {activityReviewDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        {doc.file_name} <span className="text-gray-400">({doc.document_type || 'Document'})</span>
                      </span>
                      <Button size="small" type="link" onClick={() => viewDocument(doc)}>
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No documents attached to this activity.</div>
              )}
            </div>

            {isRejectingActivity ? (
              <div className="mt-4">
                <div className="mb-1 text-sm font-semibold text-red-600">Reason for rejection (required)</div>
                <Input.TextArea
                  rows={3}
                  autoFocus
                  placeholder="Explain what needs to change before this can be approved"
                  value={activityRejectReason}
                  onChange={(event) => setActivityRejectReason(event.target.value)}
                />
              </div>
            ) : (
              <div className="mt-4">
                <div className="mb-1 text-sm font-semibold">Comment (optional)</div>
                <Input.TextArea
                  rows={3}
                  placeholder="Any remarks about this activity"
                  value={activityReviewComment}
                  onChange={(event) => setActivityReviewComment(event.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title={activityProgressTarget ? `Update Progress — ${activityProgressTarget.name}` : 'Update Progress'}
        open={Boolean(activityProgressTarget)}
        onCancel={closeActivityProgress}
        destroyOnHidden
        width={720}
        centered
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto', paddingRight: 4 } }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={closeActivityProgress}>Close</Button>
          </div>
        }
      >
        {activityProgressTarget && (() => {
          // Only documents uploaded from this popup count as progress
          // evidence — the mandatory files attached back when the activity
          // was first created are a different requirement and shouldn't
          // silently satisfy "show evidence of the work performed."
          const evidenceDocs = activityProgressDocs.filter((doc) => doc.document_type === 'Activity Evidence')
          return (
          <div>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Planned Start">
                {formatDate(activityProgressTarget.planned_start_date)}
              </Descriptions.Item>
              <Descriptions.Item label="Planned End">
                {formatDate(activityProgressTarget.planned_end_date)}
              </Descriptions.Item>
              <Descriptions.Item label="Expected Deliverable">
                {activityProgressTarget.expected_deliverable || '—'}
              </Descriptions.Item>
            </Descriptions>

            {activityProgressTarget.plan_change_status !== 'approved' ? (
              <Alert
                className="mt-3"
                type="warning"
                showIcon
                message="Awaiting reviewer approval"
                description="This activity must be reviewed and approved by the reviewer before progress can be logged or it can be marked complete."
              />
            ) : (
              <>
                {activityProgressTarget.progress_review_status === 'pending' && (
                  <Alert className="mt-3" type="info" showIcon message="Submitted — awaiting reviewer decision" />
                )}
                {activityProgressTarget.progress_review_status === 'rejected' && (
                  <Alert
                    className="mt-3"
                    type="error"
                    showIcon
                    message="Reviewer rejected this progress update"
                    description={activityProgressTarget.progress_review_comment || undefined}
                  />
                )}

                <div className="mt-4">
                  <div className="mb-1 text-sm font-semibold">Actual Start Date</div>
                  <Space>
                    <DatePicker
                      value={progressActualStart}
                      onChange={setProgressActualStart}
                      disabled={Boolean(activityProgressTarget.actual_end_date)}
                    />
                    <Button
                      onClick={saveActivityActualStart}
                      loading={progressSaving}
                      disabled={!progressActualStart || Boolean(activityProgressTarget.actual_end_date)}
                    >
                      Save
                    </Button>
                  </Space>
                </div>

                <div className="mt-4">
                  <Button
                    type="primary"
                    style={{ backgroundColor: '#800000', borderColor: '#800000' }}
                    disabled={
                      !activityProgressTarget.actual_start_date || Boolean(activityProgressTarget.actual_end_date)
                    }
                    loading={progressSaving}
                    onClick={markActivityComplete}
                  >
                    Mark Complete
                  </Button>
                </div>

                <div className="mt-4">
                  <div className="mb-1 text-sm font-semibold">Add Remark</div>
                  <Input.TextArea
                    rows={2}
                    placeholder="Optional note about this activity's progress"
                    value={progressRemark}
                    onChange={(event) => setProgressRemark(event.target.value)}
                  />
                  <Button
                    className="mt-2"
                    onClick={addActivityRemark}
                    loading={progressSaving}
                    disabled={!progressRemark.trim()}
                  >
                    Add remark
                  </Button>
                  {activityProgressHistory.length > 0 && (
                    <div className="mt-3 max-h-32 overflow-y-auto rounded border border-gray-100 p-2">
                      {activityProgressHistory.map((entry) => (
                        <div key={entry.id} className="border-b border-gray-100 py-1 text-xs last:border-0">
                          <span className="text-gray-400">{formatDate(entry.created_at)} — </span>
                          {entry.remark}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="mb-1 text-sm font-semibold">
                    Evidence Documents <span style={{ color: '#ff4d4f' }}>*</span>
                  </div>
                  {activityProgressDocsLoading ? (
                    <Spin size="small" />
                  ) : evidenceDocs.length > 0 ? (
                    <div className="mb-2 flex flex-col gap-1">
                      {evidenceDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between gap-2 text-sm">
                          <span>{doc.file_name}</span>
                          <Button size="small" type="link" onClick={() => viewDocument(doc)}>
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-2 text-sm text-gray-500">
                      No evidence attached yet — required before submitting.
                    </div>
                  )}
                  <Upload showUploadList={false} multiple accept=".pdf,.docx,.xlsx" customRequest={handleEvidenceUpload}>
                    <Button icon={<UploadOutlined />} loading={progressUploading}>
                      Attach evidence
                    </Button>
                  </Upload>
                </div>

                <div className="mt-5">
                  <Button
                    type="primary"
                    block
                    style={{ backgroundColor: '#800000', borderColor: '#800000' }}
                    disabled={
                      activityProgressTarget.progress_review_status === 'pending' || evidenceDocs.length === 0
                    }
                    loading={progressSaving}
                    onClick={submitProgressForReview}
                  >
                    Submit Progress Update for Review
                  </Button>
                </div>
              </>
            )}
          </div>
          )
        })()}
      </Modal>

      <Modal
        title={documentReviewTarget ? `Review document — ${documentReviewTarget.file_name}` : 'Review document'}
        open={Boolean(documentReviewTarget)}
        onCancel={closeDocumentReview}
        destroyOnHidden
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeDocumentReview}>Cancel</Button>
            <Button danger loading={documentReviewSaving} onClick={() => submitDocumentReview('returned')}>
              Return with comments
            </Button>
            <Button
              type="primary"
              style={{ backgroundColor: '#800000', borderColor: '#800000' }}
              loading={documentReviewSaving}
              onClick={() => submitDocumentReview('approved')}
            >
              Approve
            </Button>
          </div>
        }
      >
        {documentReviewTarget && (
          <div>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="File">{documentReviewTarget.file_name}</Descriptions.Item>
              <Descriptions.Item label="Type">{documentReviewTarget.document_type || '—'}</Descriptions.Item>
            </Descriptions>
            <div className="mt-3">
              <Button size="small" icon={<EyeOutlined />} onClick={() => viewDocument(documentReviewTarget)}>
                View document
              </Button>
            </div>
            <div className="mt-4">
              <div className="mb-1 text-sm font-semibold">Comment</div>
              <Input.TextArea
                rows={3}
                placeholder="Required if returning — explain what needs to change"
                value={documentReviewComment}
                onChange={(event) => setDocumentReviewComment(event.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title={reassignTarget ? `Reassign planner — ${reassignTarget.name}` : 'Reassign planner'}
        open={Boolean(reassignTarget)}
        onCancel={() => {
          setReassignTarget(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={submitReassign} className="pt-2">
          <Form.Item name="planner_id" label="Planner" rules={[{ required: true, message: 'Select a planner' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={planners.map((item) => ({
                value: item.id,
                label: `${item.name} (${item.email})`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ProjectsPage
