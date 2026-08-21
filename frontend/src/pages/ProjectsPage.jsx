import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import { Plus, Search } from 'lucide-react'
import api from '../lib/axios'
import { storeProjectId, unwrapList } from '../lib/apiHelpers'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../utility/Config.jsx'
import RoleGuard from '../components/common/RoleGuard'

const { Text } = Typography

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

function ProjectsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [reassignTarget, setReassignTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const canRegister = hasPermission(user, 'projects.register')
  const canReassign =
    hasPermission(user, 'projects.assign_planner') || hasPermission(user, 'projects.reassign_planner')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [projectsRes, usersRes] = await Promise.all([api.get('/projects'), api.get('/users')])
      setProjects(unwrapList(projectsRes.data))
      setUsers(unwrapList(usersRes.data))
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not load projects.')
    } finally {
      setLoading(false)
    }
  }, [])

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
    if (!term) return projects
    return projects.filter((project) =>
      [project.name, project.category, project.project_type, project.status, project.phase, project.planner?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [projects, search])

  const openProject = (project, path) => {
    storeProjectId(project.id)
    navigate(path)
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
      render: (value, record) => (
        <div>
          <div className="font-medium">{value}</div>
          <Text type="secondary">{record.annual_plan_reference || 'No APR ref'}</Text>
        </div>
      ),
    },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 130 },
    { title: 'Type', dataIndex: 'project_type', key: 'project_type', width: 170 },
    {
      title: 'Track',
      dataIndex: 'review_track',
      key: 'review_track',
      width: 90,
      render: (value, record) => value || record.workflow?.review_track || '—',
    },
    {
      title: 'Planner',
      key: 'planner',
      render: (_, record) => record.planner?.name || 'Unassigned',
    },
    {
      title: 'Status',
      key: 'status',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Tag color={STATUS_COLOR[record.status] || 'default'}>{record.status || '—'}</Tag>
          <Text type="secondary">{record.phase || record.workflow?.phase}</Text>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 280,
      render: (_, record) => (
        <Space wrap>
          <Button size="small" onClick={() => openProject(record, '/reviews')}>
            Reviews
          </Button>
          <Button size="small" onClick={() => openProject(record, '/implementation-plan')}>
            Plan
          </Button>
          {canReassign && (
            <Button
              size="small"
              onClick={() => {
                setReassignTarget(record)
                form.setFieldsValue({ planner_id: record.planner_id })
              }}
            >
              Reassign
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: '#650018' }}>
            Projects
          </h2>
          <Text type="secondary">Registered projects, planner assignment, and review status.</Text>
        </div>
        <RoleGuard allow={[ROLES.PRV, ROLES.PAD]}>
          {canRegister && (
            <Button type="primary" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/projects/create')}>
              Register project
            </Button>
          )}
        </RoleGuard>
      </div>

      <Card>
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
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={{ emptyText: 'No projects registered yet.' }}
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
