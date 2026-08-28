import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, Descriptions, Form, Input, Modal, Select, Spin, Table, Tag, message } from 'antd'
import {
  AuditOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  FormOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import { Search } from 'lucide-react'
import api from '../lib/axios'
import { fetchAuthorizedFileUrl, storeProjectId, unwrapList } from '../lib/apiHelpers'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../utility/Config.jsx'
import { deriveStatus } from '../lib/status'
import ReviewWorkspaceDrawer from '../components/reviews/ReviewWorkspaceDrawer'

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
  const [reviewTarget, setReviewTarget] = useState(null)
  const [detailDownloading, setDetailDownloading] = useState(false)
  const [detailDocuments, setDetailDocuments] = useState([])
  const [detailDocumentsLoading, setDetailDocumentsLoading] = useState(false)
  const [actionsOpenId, setActionsOpenId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const isPlannerRole = activeRole?.name === ROLES.PPL
  const isReviewerRole = activeRole?.name === ROLES.PRV
  const canReassign =
    hasPermission(user, 'projects.assign_planner') || hasPermission(user, 'projects.reassign_planner')
  const isCompletedView = view === 'completed'

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

  const openProject = (project, tab = 'overview', extraParams = {}) => {
    setActionsOpenId(null)
    storeProjectId(project.id)
    const params = new URLSearchParams({ tab, ...extraParams })
    navigate(`/projects/${project.id}?${params.toString()}`)
  }

  const openDetail = (record) => {
    setActionsOpenId(null)
    setDetailTarget(record)

    setDetailDocuments([])
    setDetailDocumentsLoading(true)
    api
      .get(`/projects/${record.id}/documents`)
      .then((response) => {
        const docs = unwrapList(response.data).filter((doc) => doc.is_current !== false)
        setDetailDocuments(docs)
      })
      .catch(() => {
        setDetailDocuments([])
        message.error('Could not load project documents.')
      })
      .finally(() => {
        setDetailDocumentsLoading(false)
      })
  }

  const openReview = (record) => {
    setActionsOpenId(null)
    storeProjectId(record.id)
    setReviewTarget(record)
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

  const renderActions = (record) => {
    const detailBtn = (
      <Button
        type="text"
        block
        className="!justify-start"
        icon={<EyeOutlined />}
        onClick={() => openDetail(record)}
      >
        See Whole Detail
      </Button>
    )

    if (isCompletedView) {
      return detailBtn
    }

    if (isPlannerRole) {
      return (
        <>
          {detailBtn}
          <Button
            type="text"
            block
            className="!justify-start"
            icon={<EyeOutlined />}
            onClick={() => openProject(record, 'plan')}
          >
            View Activity
          </Button>
        </>
      )
    }

    if (isReviewerRole) {
      return (
        <>
          {detailBtn}
          {canReassign && (
            <Button
              type="text"
              block
              className="!justify-start"
              icon={<SwapOutlined />}
              onClick={() => openReassign(record)}
            >
              Reassign
            </Button>
          )}
          <Button
            type="text"
            block
            className="!justify-start"
            icon={<AuditOutlined />}
            onClick={() => openReview(record)}
          >
            Review
          </Button>
        </>
      )
    }

    return (
      <>
        {detailBtn}
        <Button
          type="text"
          block
          className="!justify-start"
          icon={<AuditOutlined />}
          onClick={() => openReview(record)}
        >
          Review
        </Button>
        <Button
          type="text"
          block
          className="!justify-start"
          icon={<FormOutlined />}
          onClick={() => openProject(record, 'plan')}
        >
          Plan
        </Button>
        {canReassign && (
          <Button
            type="text"
            block
            className="!justify-start"
            icon={<SwapOutlined />}
            onClick={() => openReassign(record)}
          >
            Reassign
          </Button>
        )}
      </>
    )
  }

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
          {record.status || '—'}
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
          aria-label="View project details"
          style={{
            backgroundColor: '#800000',
            borderColor: '#800000',
            color: '#fff',
            fontWeight: 800,
          }}
          onClick={() => openDetail(record)}
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Card className="page-shell-card">
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
        }}
        destroyOnHidden
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, width: '100%' }}>
            {isPlannerRole && detailTarget && (
              <Button
                key="add"
                type="default"
                style={{ borderColor: '#800000', color: '#800000', fontWeight: 800 }}
                onClick={() => {
                  const project = detailTarget
                  setDetailTarget(null)
                  setDetailDocuments([])
                  openProject(project, 'plan')
                }}
              >
                View Activity
              </Button>
            )}
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
              <Descriptions.Item label="Planner">{detailTarget.planner?.name || 'Unassigned'}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLOR[detailTarget.status] || 'default'}>{detailTarget.status || '—'}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <div className="mt-4 rounded border border-gray-200 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-bold" style={{ color: '#800000' }}>
                    Documents
                  </div>
                  <div className="text-xs text-gray-500">{detailDocuments.length} current file(s)</div>
                </div>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  type="default"
                  loading={detailDownloading}
                  onClick={() => downloadProjectFiles(detailTarget)}
                >
                  Download File
                </Button>
              </div>

              {detailDocumentsLoading ? (
                <div className="mt-2">
                  <Spin size="small" />
                </div>
              ) : (
                <div className="mt-2 text-sm text-gray-700">
                  {detailDocuments.length ? (
                    detailDocuments.slice(0, 3).map((d) => d.file_name).join(', ') +
                    (detailDocuments.length > 3 ? ` +${detailDocuments.length - 3} more` : '')
                  ) : (
                    'No current documents.'
                  )}
                </div>
              )}
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

      <ReviewWorkspaceDrawer
        open={Boolean(reviewTarget)}
        project={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onCompleted={() => {
          load()
        }}
      />
    </div>
  )
}

export default ProjectsPage
