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
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd'
import { CloseCircleOutlined, DownloadOutlined, PlusOutlined } from '@ant-design/icons'
import { Search } from 'lucide-react'
import api from '../lib/axios'
import { fetchAuthorizedFileUrl, storeProjectId, unwrapItem, unwrapList } from '../lib/apiHelpers'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../utility/Config.jsx'
import { deriveStatus } from '../lib/status'
import { formatDate } from '../lib/dates'
import InitiationDocumentsPanel from '../components/projects/InitiationDocumentsPanel'
import ProjectWorkspaceTabs, { defaultWorkspaceTab } from '../components/projects/ProjectWorkspaceTabs'

const ProjectRegistration = lazy(() => import('./ProjectRegistration'))

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
  const [detailWorkspaceTab, setDetailWorkspaceTab] = useState('plan')
  const [detailWorkflow, setDetailWorkflow] = useState(null)
  const [activityReviewTarget, setActivityReviewTarget] = useState(null)
  const [activityReviewDocs, setActivityReviewDocs] = useState([])
  const [activityReviewDocsLoading, setActivityReviewDocsLoading] = useState(false)
  const [activityReviewComment, setActivityReviewComment] = useState('')
  const [isRejectingActivity, setIsRejectingActivity] = useState(false)
  const [activityRejectReason, setActivityRejectReason] = useState('')
  const [activityReviewSaving, setActivityReviewSaving] = useState(false)
  const [downloadingDocId, setDownloadingDocId] = useState(null)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
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

  useEffect(() => {
    const detailId = Number(searchParams.get('detail'))
    const tab = searchParams.get('tab')
    if (!Number.isFinite(detailId) || detailId <= 0) return

    const project = projects.find((item) => item.id === detailId)
    if (!project) return

    if (!detailTarget || detailTarget.id !== detailId) {
      openDetail(project)
    }
    if (tab && ['plan', 'rtm', 'documents', 'closure'].includes(tab)) {
      setDetailWorkspaceTab(tab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open when list loads with ?detail=
  }, [projects, searchParams])

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
    load()
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

  const openDetail = (record) => {
    setActionsOpenId(null)
    setDetailTarget(record)
    setDetailWorkflow(null)
    storeProjectId(record.id)
    setDetailWorkspaceTab(defaultWorkspaceTab(record, activeRole?.name))
    loadDetailWorkflow(record.id)

    if (isPlannerRole) {
      loadUsersForReassign()
    }
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
    load()
  }

  const openReassign = (record) => {
    setActionsOpenId(null)
    setReassignTarget(record)
    form.setFieldsValue({ planner_id: record.planner_id })
    loadUsersForReassign()
  }

  const viewDocument = async (doc) => {
    setPreviewDoc(doc)
    setPreviewUrl(null)
    setPreviewLoading(true)
    try {
      const url = await fetchAuthorizedFileUrl(doc.id)
      setPreviewUrl(url)
    } catch {
      message.error('Could not open document.')
      setPreviewDoc(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewDoc(null)
    setPreviewUrl(null)
  }

  const downloadSingleDocument = async (doc) => {
    setDownloadingDocId(doc.id)
    try {
      const url = await fetchAuthorizedFileUrl(doc.id)
      const link = document.createElement('a')
      link.href = url
      link.download = doc.file_name || 'document'
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      message.error('Could not download document.')
    } finally {
      setDownloadingDocId(null)
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
        message.success(decision === 'approve' ? 'Plan approved' : 'Plan returned to the planner')
        closeActivityReview()
        loadDetailWorkflow(detailTarget.id)
        load()
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
      const response = await api.post(`/activities/${activityReviewTarget.id}/${kind}/${decision}`, payload)
      const updated = unwrapItem(response.data)
      message.success(decision === 'approve' ? 'Activity approved' : 'Activity rejected')
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
      await load()
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
      <Card className="page-shell-card" styles={{ body: { padding: '12px 16px' } }}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <Tabs
            type="card"
            activeKey={view}
            className="!mb-0"
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
              .join(' Â· ')}
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
            emptyText: isCompletedView
              ? 'No completed projects yet.'
              : isPlannerRole
                ? 'No projects assigned to you.'
                : 'No ongoing projects.',
          }}
        />
      </Card>

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
        width={1200}
        centered
        styles={{ body: { maxHeight: '82vh', overflowY: 'auto', paddingRight: 4 } }}
        footer={
          <Button type="default" onClick={() => setDetailTarget(null)}>
            Close
          </Button>
        }
      >
        {detailTarget && (
          <div>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Name">{detailTarget.name || 'â€”'}</Descriptions.Item>
              <Descriptions.Item label="Category">{detailTarget.category || 'â€”'}</Descriptions.Item>
              <Descriptions.Item label="Type">{detailTarget.project_type || 'â€”'}</Descriptions.Item>
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

            {detailTarget.plan_review_status === 'changes_requested' && detailTarget.plan_review_comment && isPlannerRole && (
              <Alert
                className="mt-4"
                type="warning"
                showIcon
                message="Plan returned â€” updates required"
                description={detailTarget.plan_review_comment}
              />
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
              <ProjectWorkspaceTabs
                projectId={detailTarget.id}
                project={detailTarget}
                activeTab={detailWorkspaceTab}
                onTabChange={setDetailWorkspaceTab}
                workflow={detailWorkflow}
                onProjectChanged={handleWorkspaceChanged}
                onActivityReview={isReviewerRole ? openActivityReview : undefined}
                shouldShowActivityReview={isReviewerRole ? activityNeedsReview : undefined}
              />
            )}
          </div>
        )}
      </Modal>

      <Modal
        title={<span style={{ color: '#800000', fontWeight: 700 }}>Review activity</span>}
        open={Boolean(activityReviewTarget)}
        onCancel={closeActivityReview}
        destroyOnHidden
        centered
        width={760}
        zIndex={1100}
        maskClosable={false}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {isRejectingActivity ? (
              <>
                <Button danger loading={activityReviewSaving} onClick={() => submitActivityReview('reject')}>
                  Confirm reject
                </Button>
                <Button onClick={() => setIsRejectingActivity(false)}>Back</Button>
              </>
            ) : (
              <>
                <Button
                  type="primary"
                  style={{ backgroundColor: '#800000', borderColor: '#800000' }}
                  loading={activityReviewSaving}
                  onClick={() => submitActivityReview('approve')}
                >
                  Approve
                </Button>
                <Button danger loading={activityReviewSaving} onClick={() => submitActivityReview('reject')}>
                  Reject
                </Button>
                <Button onClick={closeActivityReview}>Cancel</Button>
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
                {activityReviewTarget.expected_deliverable || 'â€”'}
              </Descriptions.Item>
              <Descriptions.Item label="Planned Start">
                {formatDate(activityReviewTarget.planned_start_date)}
              </Descriptions.Item>
              <Descriptions.Item label="Planned End">
                {formatDate(activityReviewTarget.planned_end_date)}
              </Descriptions.Item>
              <Descriptions.Item label="Responsible Person">
                {activityReviewTarget.responsible_person?.name || 'â€”'}
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
                {activityPendingMessage(activityReviewTarget)}
              </Descriptions.Item>
            </Descriptions>

            <div className="mt-4">
              <div className="mb-1 text-sm font-semibold">Documents</div>
              <Spin spinning={activityReviewDocsLoading}>
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={activityReviewDocs}
                  pagination={false}
                  locale={{ emptyText: 'No documents attached to this activity.' }}
                  columns={[
                    { title: 'File', dataIndex: 'file_name' },
                    { title: 'Type', dataIndex: 'document_type', render: (value) => value || 'Document' },
                    {
                      title: 'Action',
                      width: 100,
                      render: (_, doc) => (
                        <Button size="small" onClick={() => viewDocument(doc)}>
                          View
                        </Button>
                      ),
                    },
                  ]}
                />
              </Spin>
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
        title={reassignTarget ? `Reassign planner â€” ${reassignTarget.name}` : 'Reassign planner'}
        open={Boolean(reassignTarget)}
        onCancel={() => {
          setReassignTarget(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        confirmLoading={saving}
        footer={(_, { OkBtn, CancelBtn }) => (
          <>
            <OkBtn />
            <CancelBtn />
          </>
        )}
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

      <Modal
        title={previewDoc?.file_name}
        open={previewDoc !== null}
        onCancel={closePreview}
        destroyOnHidden
        width={860}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button
              icon={<DownloadOutlined />}
              loading={downloadingDocId === previewDoc?.id}
              onClick={() => previewDoc && downloadSingleDocument(previewDoc)}
            >
              Download
            </Button>
            <Button onClick={closePreview}>Close</Button>
          </div>
        }
      >
        {previewLoading ? (
          <div className="flex justify-center py-16">
            <Spin />
          </div>
        ) : previewUrl && previewDoc?.file_name?.toLowerCase().endsWith('.pdf') ? (
          <iframe
            src={previewUrl}
            title={previewDoc.file_name}
            style={{ width: '100%', height: '70vh', border: 'none' }}
          />
        ) : previewUrl ? (
          <div className="py-16 text-center text-sm text-gray-500">
            Preview isn't available for this file type — use Download to view it.
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default ProjectsPage
