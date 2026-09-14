import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd'
import { CloseCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { Search } from 'lucide-react'
import api from '../lib/axios'
import { fetchProjectsCached } from '../lib/projectsCache'
import { storeProjectId, unwrapItem, unwrapList } from '../lib/apiHelpers'
import { useDocumentPreview } from '../lib/useDocumentPreview'
import DocumentPreviewModal from '../components/documents/DocumentPreviewModal'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../utility/Config.jsx'
import { deriveStatus } from '../lib/status'
import { formatDate } from '../lib/dates'
import InitiationDocumentsPanel from '../components/projects/InitiationDocumentsPanel'
import ProjectWorkspaceTabs from '../components/projects/ProjectWorkspaceTabs'
import ActivityReviewModal from '../components/projects/ActivityReviewModal'
import ReassignPlannerModal from '../components/projects/ReassignPlannerModal'
import ClosureReturnModal from '../components/projects/ClosureReturnModal'

const ProjectRegistration = lazy(() => import('./ProjectRegistration'))

// Stable reference so a scope with no rows yet doesn't make `projects` (and
// everything memoized off it) look like a new value on every render.
const EMPTY_PROJECTS = []

const DERIVED_STATUS_LABELS = { not_started: 'Not started', ongoing: 'Ongoing', completed: 'Completed' }
const LIFECYCLE_STAGE_LABELS = { initiation: 'Initiation', planning: 'Planning', execution: 'Execution', closure: 'Closure' }

const STATUS_COLOR = {
  Initiated: 'default',
  Planning: 'purple',
  'Plan Submitted': 'gold',
  'Plan Returned': 'orange',
  'Plan Approved': 'green',
  'In Execution': 'blue',
  Closed: 'red',
}

// Display-only relabeling â€” the stored status value stays "Plan Submitted"
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

export function isCompletedProject(project) {
  return Boolean(project?.closed_at) || project?.status === 'Closed'
}

// Only Reviewer reaches the full, unscoped portfolio table — everyone else
// has their own Pending/History queue page and reaches this component only
// via a ?detail= deep link to one specific project (see canBrowseAll
// below), never the list itself.
const PROJECT_LIST_ROLES = [ROLES.PRV]

function ProjectsPage() {
  const { user, activeRole } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const canBrowseAll = PROJECT_LIST_ROLES.includes(activeRole?.name)
  // Keyed by scope ('ongoing' | 'completed') so switching tabs never
  // refetches or re-renders the tab you're leaving — each tab's rows are
  // fetched once, on first visit, straight from the server (GET
  // /projects?scope=...), not filtered client-side out of one big list.
  const [projectsByScope, setProjectsByScope] = useState({})
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState(() => searchParams.get('q') || '')
  const derivedStatusFilter = searchParams.get('derivedStatus')
  const lifecycleStageFilter = searchParams.get('lifecycleStage')
  const view = searchParams.get('view') === 'completed' ? 'completed' : 'ongoing'
  const [reassignTarget, setReassignTarget] = useState(null)
  const [detailTarget, setDetailTarget] = useState(null)
  const [detailWorkflow, setDetailWorkflow] = useState(null)
  const [requestingClosure, setRequestingClosure] = useState(false)
  const [signingOffClosure, setSigningOffClosure] = useState(false)
  const [returningClosure, setReturningClosure] = useState(false)
  const [closureReturnOpen, setClosureReturnOpen] = useState(false)
  const [closureReturnComment, setClosureReturnComment] = useState('')
  const [closureCompletedActivities, setClosureCompletedActivities] = useState([])
  const [closureCompletedRequirements, setClosureCompletedRequirements] = useState([])
  const [closureActivityIds, setClosureActivityIds] = useState([])
  const [closureRequirementIds, setClosureRequirementIds] = useState([])
  const [closureItemsLoading, setClosureItemsLoading] = useState(false)
  const [activityReviewTarget, setActivityReviewTarget] = useState(null)
  const [activityReviewDocs, setActivityReviewDocs] = useState([])
  const [activityReviewDocsLoading, setActivityReviewDocsLoading] = useState(false)
  const [activityReviewComment, setActivityReviewComment] = useState('')
  const [isRejectingActivity, setIsRejectingActivity] = useState(false)
  const [activityRejectReason, setActivityRejectReason] = useState('')
  const [activityReviewSaving, setActivityReviewSaving] = useState(false)
  const [actionsOpenId, setActionsOpenId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [registerLoaded, setRegisterLoaded] = useState(false)
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

  const load = useCallback(async (scope) => {
    setLoading(true)
    try {
      const projectsRes = await fetchProjectsCached({ scope })
      const list = unwrapList(projectsRes.data)
      setProjectsByScope((prev) => ({ ...prev, [scope]: list }))
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not load projects.')
    } finally {
      setLoading(false)
    }
  }, [])

  const projects = useMemo(() => projectsByScope[view] ?? EMPTY_PROJECTS, [projectsByScope, view])

  const loadUsersForReassign = useCallback(async () => {
    if (users.length) return
    try {
      const usersRes = await api.get('/users')
      setUsers(unwrapList(usersRes.data))
    } catch {
      message.error('Could not load planners.')
    }
  }, [users.length])

  const loadDetailWorkflow = (projectId) => {
    api
      .get(`/projects/${projectId}/workflow`)
      .then((response) => setDetailWorkflow(unwrapItem(response.data)))
      .catch(() => setDetailWorkflow(null))
  }

  const openDetail = (record) => {
    setActionsOpenId(null)
    setDetailTarget(record)
    setDetailWorkflow(null)
    storeProjectId(record.id)
    loadDetailWorkflow(record.id)

    if (isPlannerRole) {
      loadUsersForReassign()
    }
  }

  useEffect(() => {
    if (!canBrowseAll) return
    load(view)
  }, [canBrowseAll, view, load])

  useEffect(() => {
    const detailId = Number(searchParams.get('detail'))
    if (!Number.isFinite(detailId) || detailId <= 0) return
    if (detailTarget && detailTarget.id === detailId) return

    // Browse-all roles already have this tab's rows loaded — reuse them.
    // Everyone else (deep-linked in from their own queue page) never loads
    // the table at all, and a browse-all role can also land here with the
    // linked project sitting in the OTHER tab — either way, fetch that one
    // project directly instead of depending on a list that may not have it.
    const cached = canBrowseAll ? projects.find((item) => item.id === detailId) : null
    if (cached) {
      openDetail(cached)
      return
    }
    api
      .get(`/projects/${detailId}`)
      .then((response) => openDetail(unwrapItem(response.data)))
      .catch(() => message.error('Could not load that project.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open when the link target loads
  }, [projects, searchParams, canBrowseAll])

  // After Register project → land on Ongoing list, toast, and refresh.
  const handleRegistered = ({ id, name }) => {
    setRegisterOpen(false)
    if (searchParams.get('view') === 'completed') {
      const next = new URLSearchParams(searchParams)
      next.delete('view')
      setSearchParams(next, { replace: true })
    }
    message.success(`Project "${name}" registered successfully`)
    storeProjectId(id)
    load(view)
  }

  const planners = useMemo(() => {
    const filtered = users.filter((item) =>
      (item.roles || []).some((role) => role.name === ROLES.PPL),
    )
    return filtered.length ? filtered : users
  }, [users])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return projects.filter((project) => {
      if (derivedStatusFilter && deriveStatus(project) !== derivedStatusFilter) return false
      if (lifecycleStageFilter && project.lifecycle_stage !== lifecycleStageFilter) return false
      if (!term) return true
      return [project.name, project.category, project.project_type, project.status, project.phase, project.planner?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [projects, search, derivedStatusFilter, lifecycleStageFilter])

  const clearStructuredFilter = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('derivedStatus')
    next.delete('lifecycleStage')
    setSearchParams(next, { replace: true })
  }

  const handleWorkspaceChanged = () => {
    if (!detailTarget) return
    loadDetailWorkflow(detailTarget.id)
    api
      .get(`/projects/${detailTarget.id}`)
      .then((response) => {
        const updated = unwrapItem(response.data)
        setDetailTarget((prev) => (prev ? { ...prev, ...updated } : updated))
      })
      .catch(() => {})
    // Non-browse-all roles never loaded the scoped table in the first
    // place — the direct GET above already keeps their one open project
    // current, nothing else on screen depends on the list.
    if (canBrowseAll) load(view)
  }

  const requestClosure = async () => {
    if (!detailTarget) return
    setRequestingClosure(true)
    try {
      await api.post(`/projects/${detailTarget.id}/closure/request`)
      message.success('Closure requested')
      handleWorkspaceChanged()
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not request closure.')
    } finally {
      setRequestingClosure(false)
    }
  }

  const signOffClosure = async () => {
    if (!detailTarget) return
    setSigningOffClosure(true)
    try {
      await api.post(`/projects/${detailTarget.id}/close`)
      message.success('Project closed')
      handleWorkspaceChanged()
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not close the project.')
    } finally {
      setSigningOffClosure(false)
    }
  }

  const openClosureReturn = async () => {
    if (!detailTarget) return
    setClosureReturnOpen(true)
    setClosureItemsLoading(true)
    try {
      const [activitiesRes, requirementsRes] = await Promise.all([
        api.get(`/projects/${detailTarget.id}/activities`),
        api.get(`/projects/${detailTarget.id}/requirements`),
      ])
      setClosureCompletedActivities(unwrapList(activitiesRes.data).filter((item) => item.actual_end_date))
      setClosureCompletedRequirements(unwrapList(requirementsRes.data).filter((item) => item.actual_end_date))
    } catch {
      setClosureCompletedActivities([])
      setClosureCompletedRequirements([])
    } finally {
      setClosureItemsLoading(false)
    }
  }

  const submitReturnClosure = async () => {
    if (!detailTarget) return
    if (!closureReturnComment.trim()) {
      message.error('Add a comment explaining what needs fixing')
      return
    }
    setReturningClosure(true)
    try {
      await api.post(`/projects/${detailTarget.id}/closure/return`, {
        comment: closureReturnComment.trim(),
        activity_ids: closureActivityIds,
        requirement_ids: closureRequirementIds,
      })
      message.success('Returned to planner')
      setClosureReturnOpen(false)
      setClosureReturnComment('')
      setClosureActivityIds([])
      setClosureRequirementIds([])
      handleWorkspaceChanged()
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not return to planner.')
    } finally {
      setReturningClosure(false)
    }
  }

  const openReassign = (record) => {
    setActionsOpenId(null)
    setReassignTarget(record)
    form.setFieldsValue({ planner_id: record.planner_id })
    loadUsersForReassign()
  }

  const {
    previewDoc,
    previewUrl,
    previewHtml,
    previewKind,
    previewLoading,
    downloadingId,
    viewDocument,
    closePreview,
    downloadDocument,
  } = useDocumentPreview()

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

    const isPlanSubmissionReview =
      detailTarget?.plan_review_status === 'pending_review' &&
      activityReviewTarget.progress_review_status !== 'pending' &&
      activityReviewTarget.plan_change_status !== 'pending'

    if (isPlanSubmissionReview) {
      const comment =
        decision === 'reject' ? activityRejectReason.trim() : activityReviewComment.trim()
      if (decision === 'reject' && !comment) {
        message.error('Please provide a reason for rejecting.')
        return
      }
      setActivityReviewSaving(true)
      try {
        const response = await api.post(`/projects/${detailTarget.id}/plan/review`, {
          decision: decision === 'approve' ? 'approved' : 'returned',
          comment: comment || undefined,
        })
        const updated = unwrapItem(response.data)
        setDetailTarget((prev) => (prev ? { ...prev, ...updated } : updated))
        closeActivityReview()
        loadDetailWorkflow(detailTarget.id)
        if (canBrowseAll) load(view)
      } catch (err) {
        message.error(err.response?.data?.message || 'Could not submit the plan decision.')
      } finally {
        setActivityReviewSaving(false)
      }
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
      await api.post(`/activities/${activityReviewTarget.id}/${kind}/${decision}`, payload)
      closeActivityReview()
      handleWorkspaceChanged()
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not submit the review decision.')
    } finally {
      setActivityReviewSaving(false)
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
      if (canBrowseAll) await load(view)
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not reassign planner.')
    } finally {
      setSaving(false)
    }
  }

  const detailInExecution = Boolean(detailTarget?.execution_started_at || detailWorkflow?.execution_started_at)

  const activityNeedsReview = (activityRecord) => {
    if (!isReviewerRole) return false
    if (activityRecord.progress_review_status === 'pending') return true
    if (activityRecord.plan_change_status === 'pending') return true
    if (detailTarget?.plan_review_status === 'pending_review') return true
    return false
  }

  const activityPendingMessage = (activityRecord) => {
    if (activityRecord.progress_review_status === 'pending') {
      return 'A progress update is awaiting your decision.'
    }
    if (activityRecord.plan_change_status === 'pending') {
      return 'A plan change is awaiting your decision.'
    }
    if (detailTarget?.plan_review_status === 'pending_review') {
      return 'This activity is awaiting your decision.'
    }
    return 'This activity is awaiting your decision.'
  }

  const columns = [
    {
      title: 'SN',
      key: 'sn',
      width: 56,
      align: 'center',
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Project Name',
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
      title: 'Action',
      key: 'actions',
      width: 110,
      align: 'center',
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            type="primary"
            aria-label={isReviewerRole ? 'Review project' : 'View project details'}
            style={{ backgroundColor: '#800000', borderColor: '#800000' }}
            onClick={() => openDetail(record)}
          >
            {isReviewerRole ? 'Review' : 'View'}
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {canBrowseAll && (
        // One 12px gutter, not the card's 1rem class padding plus a body padding on top.
        <Card className="page-shell-card" style={{ padding: 12, marginTop: 0 }} styles={{ body: { padding: 0 } }}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Tabs
              type="card"
              activeKey={view}
              className="!mb-0"
              tabBarStyle={{ marginBottom: 0 }}
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
                // 40px matches the card-type tab strip's height so the two line up.
                style={{ backgroundColor: '#800000', borderColor: '#800000', height: 40 }}
                onClick={() => {
                  setRegisterLoaded(true)
                  setRegisterOpen(true)
                }}
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
              className="mb-3"
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
            className="mb-3 max-w-md"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Table
            className="pms-house-table"
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={filtered}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            locale={{
              emptyText: isCompletedView ? 'No completed projects yet.' : 'No ongoing projects.',
            }}
          />
        </Card>
      )}

      {registerLoaded && (
        <Suspense fallback={null}>
          <ProjectRegistration
            open={registerOpen}
            onClose={() => setRegisterOpen(false)}
            onRegistered={handleRegistered}
          />
        </Suspense>
      )}

      <Modal
        title={<span style={{ color: '#800000', fontWeight: 800 }}>Details</span>}
        open={Boolean(detailTarget)}
        onCancel={() => {
          setDetailTarget(null)
          closeActivityReview()
        }}
        destroyOnHidden
        width={1320}
        centered
        styles={{ body: { maxHeight: '82vh', overflowY: 'auto', paddingRight: 4 } }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {isPlannerRole && detailWorkflow?.can_request_closure && (
              <Popconfirm
                title="Request closure?"
                description="This tells the Reviewer every activity and requirement is finished and ready for sign-off."
                okText="Request closure"
                onConfirm={requestClosure}
              >
                <Button type="primary" loading={requestingClosure}>
                  Request closure
                </Button>
              </Popconfirm>
            )}
            {isReviewerRole && detailWorkflow?.can_approve_closure && (
              <>
                <Popconfirm
                  title="Sign off and close this project?"
                  description="This is final — the project moves to Closed and cannot be reopened."
                  okText="Sign off and close"
                  onConfirm={signOffClosure}
                >
                  <Button type="primary" loading={signingOffClosure}>
                    Sign off and close
                  </Button>
                </Popconfirm>
                <Button onClick={openClosureReturn}>Return to planner</Button>
              </>
            )}
            <Button type="default" onClick={() => setDetailTarget(null)}>
              Close
            </Button>
          </div>
        }
      >
        {detailTarget && (
          <div>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Name">{detailTarget.name || 'â€”'}</Descriptions.Item>
              <Descriptions.Item label="Category">{detailTarget.category || 'â€”'}</Descriptions.Item>
              <Descriptions.Item label="Type">{detailTarget.project_type || 'â€”'}</Descriptions.Item>
              <Descriptions.Item label="Date">
                {detailTarget.planned_start_date || detailTarget.planned_end_date
                  ? `${formatDate(detailTarget.planned_start_date)} — ${formatDate(detailTarget.planned_end_date)}`
                  : '—'}
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

            {detailWorkflow?.closure_return_comment && !detailWorkflow?.closure_requested_at && !detailWorkflow?.closed_at && (
              <Alert
                className="mt-4"
                type="warning"
                showIcon
                message="Closure returned"
                description={detailWorkflow.closure_return_comment}
              />
            )}

            {detailTarget.plan_review_status === 'approved' && !detailInExecution && detailWorkflow?.execution_blockers?.length > 0 && (
              <Alert
                className="mt-4"
                type="info"
                showIcon
                message="Next step: move to execution"
                description={
                  <ul className="mb-0 mt-1 list-disc pl-5">
                    {detailWorkflow.execution_blockers.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                }
              />
            )}

            {detailTarget.lifecycle_stage === 'initiation' && canRegister ? (
              <div className="mt-4 rounded border border-gray-200 p-3">
                <InitiationDocumentsPanel
                  projectId={detailTarget.id}
                  onProceeded={() => {
                    setDetailTarget(null)
                    if (canBrowseAll) load(view)
                  }}
                />
              </div>
            ) : (
              <ProjectWorkspaceTabs
                projectId={detailTarget.id}
                onProjectChanged={handleWorkspaceChanged}
                onActivityReview={isReviewerRole ? openActivityReview : undefined}
                shouldShowActivityReview={isReviewerRole ? activityNeedsReview : undefined}
              />
            )}
          </div>
        )}
      </Modal>

      <ActivityReviewModal
        target={activityReviewTarget}
        docs={activityReviewDocs}
        docsLoading={activityReviewDocsLoading}
        comment={activityReviewComment}
        onCommentChange={setActivityReviewComment}
        rejecting={isRejectingActivity}
        rejectReason={activityRejectReason}
        onRejectReasonChange={setActivityRejectReason}
        saving={activityReviewSaving}
        pendingMessage={activityReviewTarget ? activityPendingMessage(activityReviewTarget) : ''}
        onApprove={() => submitActivityReview('approve')}
        onReject={() => submitActivityReview('reject')}
        onBack={() => setIsRejectingActivity(false)}
        onCancel={closeActivityReview}
        onViewDocument={viewDocument}
      />

      <ReassignPlannerModal
        target={reassignTarget}
        planners={planners}
        saving={saving}
        form={form}
        onCancel={() => {
          setReassignTarget(null)
          form.resetFields()
        }}
        onFinish={submitReassign}
      />

      <ClosureReturnModal
        open={closureReturnOpen}
        saving={returningClosure}
        itemsLoading={closureItemsLoading}
        comment={closureReturnComment}
        onCommentChange={setClosureReturnComment}
        completedActivities={closureCompletedActivities}
        completedRequirements={closureCompletedRequirements}
        activityIds={closureActivityIds}
        onActivityIdsChange={setClosureActivityIds}
        requirementIds={closureRequirementIds}
        onRequirementIdsChange={setClosureRequirementIds}
        onSubmit={submitReturnClosure}
        onCancel={() => {
          setClosureReturnOpen(false)
          setClosureReturnComment('')
          setClosureActivityIds([])
          setClosureRequirementIds([])
        }}
      />

      <DocumentPreviewModal
        doc={previewDoc}
        url={previewUrl}
        html={previewHtml}
        kind={previewKind}
        loading={previewLoading}
        downloading={downloadingId === previewDoc?.id}
        onClose={closePreview}
        onDownload={downloadDocument}
      />
    </div>
  )
}

export default ProjectsPage
