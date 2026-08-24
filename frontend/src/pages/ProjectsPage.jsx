import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, Form, Input, Modal, Popover, Select, Space, Table, Tag, Typography, message } from 'antd'
import {
  AuditOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FormOutlined,
  MoreOutlined,
  PlusOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import { Plus, Search } from 'lucide-react'
import api from '../lib/axios'
import { storeProjectId, unwrapList } from '../lib/apiHelpers'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../utility/Config.jsx'
import { deriveStatus } from '../lib/status'
import RoleGuard from '../components/common/RoleGuard'

const { Text } = Typography

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

function ProjectsPage() {
  const navigate = useNavigate()
  const { user, activeRole } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState(() => searchParams.get('q') || '')
  const derivedStatusFilter = searchParams.get('derivedStatus')
  const lifecycleStageFilter = searchParams.get('lifecycleStage')
  const [reassignTarget, setReassignTarget] = useState(null)
  const [actionsOpenId, setActionsOpenId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const isPlannerRole = activeRole?.name === ROLES.PPL
  const isReviewerRole = activeRole?.name === ROLES.PRV
  const canRegister = hasPermission(user, 'projects.register')
  const canReassign =
    hasPermission(user, 'projects.assign_planner') || hasPermission(user, 'projects.reassign_planner')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const projectParams = {}
      if (isPlannerRole && user?.id) {
        projectParams.planner_id = user.id
        projectParams.role = ROLES.PPL
      }

      const [projectsRes, usersRes] = await Promise.all([
        api.get('/projects', { params: projectParams }),
        api.get('/users'),
      ])

      let list = unwrapList(projectsRes.data)
      if (isPlannerRole && user) {
        list = list.filter((project) => isAssignedToPlanner(project, user))
      }

      setProjects(list)
      setUsers(unwrapList(usersRes.data))
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not load projects.')
    } finally {
      setLoading(false)
    }
  }, [isPlannerRole, user])

  useEffect(() => {
    load()
  }, [load])

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

  const openProject = (project, path, extraParams = {}) => {
    setActionsOpenId(null)
    storeProjectId(project.id)
    const params = new URLSearchParams({ projectId: String(project.id), ...extraParams })
    navigate(`${path}?${params.toString()}`)
  }

  const openReassign = (record) => {
    setActionsOpenId(null)
    setReassignTarget(record)
    form.setFieldsValue({ planner_id: record.planner_id })
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

  const columns = [
    {
      title: 'Project',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (value, record) => (
        <div>
          <div className="truncate font-medium">{value}</div>
          <Text type="secondary" className="truncate">
            {record.annual_plan_reference || 'No APR ref'}
          </Text>
        </div>
      ),
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
      title: 'Track',
      dataIndex: 'review_track',
      key: 'review_track',
      width: 90,
      align: 'center',
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (value, record) => value || record.workflow?.review_track || '—',
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
        <Space direction="vertical" size={2} className="whitespace-nowrap">
          <Tag
            color={STATUS_COLOR[record.status] || 'default'}
            style={{ marginInlineEnd: 0, whiteSpace: 'nowrap' }}
          >
            {record.status || '—'}
          </Tag>
          <Text type="secondary" className="whitespace-nowrap">
            {record.phase || record.workflow?.phase}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      align: 'center',
      fixed: 'right',
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (_, record) => (
        <Popover
          trigger="click"
          placement="bottomRight"
          arrow={{ pointAtCenter: true }}
          open={actionsOpenId === record.id}
          onOpenChange={(open) => setActionsOpenId(open ? record.id : null)}
          content={
            <div className="w-[180px]">
              <Space direction="vertical" size={4} className="w-full">
                {isPlannerRole ? (
                  <>
                    <Button
                      type="text"
                      block
                      className="!justify-start"
                      icon={<PlusOutlined />}
                      onClick={() =>
                        openProject(record, '/implementation-plan', { autoOpenAddModal: 'true' })
                      }
                    >
                      Add Activity
                    </Button>
                    <Button
                      type="text"
                      block
                      className="!justify-start"
                      icon={<EyeOutlined />}
                      onClick={() => openProject(record, '/implementation-plan')}
                    >
                      View Activity
                    </Button>
                  </>
                ) : isReviewerRole ? (
                  <>
                    <Button
                      type="text"
                      block
                      className="!justify-start"
                      icon={<AuditOutlined />}
                      onClick={() => openProject(record, '/reviews')}
                    >
                      Reviews
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
                ) : (
                  <>
                    <Button
                      type="text"
                      block
                      className="!justify-start"
                      icon={<AuditOutlined />}
                      onClick={() => openProject(record, '/reviews')}
                    >
                      Reviews
                    </Button>
                    <Button
                      type="text"
                      block
                      className="!justify-start"
                      icon={<FormOutlined />}
                      onClick={() => openProject(record, '/implementation-plan')}
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
                )}
              </Space>
            </div>
          }
        >
          <Button type="text" icon={<MoreOutlined style={{ fontSize: 18 }} />} aria-label="Actions" />
        </Popover>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        <RoleGuard allow={[ROLES.PRV, ROLES.PAD]}>
          {canRegister && (
            <Button type="primary" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/projects/create')}>
              Register project
            </Button>
          )}
        </RoleGuard>
      </div>

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
          locale={{ emptyText: isPlannerRole ? 'No projects assigned to you.' : 'No projects registered yet.' }}
        />
      </Card>

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
