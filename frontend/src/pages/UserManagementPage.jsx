import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { Plus, Search } from 'lucide-react'
import api from '../lib/axios'
import { unwrapList } from '../lib/apiHelpers'

const { Text } = Typography

function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [assignTarget, setAssignTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [createForm] = Form.useForm()
  const [assignForm] = Form.useForm()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/roles'),
      ])
      setUsers(unwrapList(usersRes.data))
      setRoles(unwrapList(rolesRes.data))
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return users
    return users.filter((user) => {
      const roleNames = (user.roles || []).map((role) => role.name).join(' ')
      return [user.name, user.email, roleNames].join(' ').toLowerCase().includes(term)
    })
  }, [users, search])

  const openAssign = (user) => {
    setAssignTarget(user)
    assignForm.setFieldsValue({
      role_ids: (user.roles || []).map((role) => role.id),
    })
  }

  const handleCreate = async (values) => {
    setSaving(true)
    try {
      await api.post('/admin/users', values)
      message.success('User created.')
      setCreateOpen(false)
      createForm.resetFields()
      await loadData()
    } catch (err) {
      const firstError = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat()[0]
        : null
      message.error(firstError || err.response?.data?.message || 'Could not create user.')
    } finally {
      setSaving(false)
    }
  }

  const handleAssign = async (values) => {
    if (!assignTarget) return
    setSaving(true)
    try {
      await api.put(`/admin/users/${assignTarget.id}/roles`, {
        role_ids: values.role_ids || [],
      })
      message.success('Roles assigned.')
      setAssignTarget(null)
      assignForm.resetFields()
      await loadData()
    } catch (err) {
      const firstError = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat()[0]
        : null
      message.error(firstError || err.response?.data?.message || 'Could not assign roles.')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      render: (userRoles = []) =>
        userRoles.length ? (
          <Space size={[4, 4]} wrap>
            {userRoles.map((role) => (
              <Tag key={role.id} color={role.name === 'ICT Support' ? 'gold' : 'red'}>
                {role.name}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">No role assigned</Text>
        ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Button type="primary" onClick={() => openAssign(record)}>
          Assign Roles
        </Button>
      ),
    },
  ]

  return (
    <div className="page-container">
      <Card className="page-shell-card" styles={{ body: { padding: 16 } }}>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            allowClear
            prefix={<Search className="h-4 w-4 text-gray-400" />}
            placeholder="Search users or roles"
            className="max-w-md"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button
            type="primary"
            className="ms-auto"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setCreateOpen(true)}
          >
            Create User
          </Button>
        </div>

        <Table
          rowKey="id"
          className="ictms-table"
          columns={columns}
          dataSource={filteredUsers}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={{ emptyText: 'No users found.' }}
        />
      </Card>

      <Modal
        title="Create User"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false)
          createForm.resetFields()
        }}
        onOk={() => createForm.submit()}
        okText="Create"
        cancelText="Close"
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate} className="pt-2">
          <Form.Item name="name" label="Full name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="Jane Doe" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email', message: 'A valid email is required' }]}
          >
            <Input placeholder="jane.doe@nssf.go.tz" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, min: 8, message: 'Password must be at least 8 characters' }]}
          >
            <Input.Password placeholder="Temporary password" />
          </Form.Item>
          <Form.Item name="role_ids" label="Roles">
            <Select
              mode="multiple"
              allowClear
              placeholder="Assign one or more roles"
              options={roles.map((role) => ({
                value: role.id,
                label: role.name,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={assignTarget ? `Assign roles — ${assignTarget.name}` : 'Assign roles'}
        open={Boolean(assignTarget)}
        onCancel={() => {
          setAssignTarget(null)
          assignForm.resetFields()
        }}
        onOk={() => assignForm.submit()}
        okText="Save"
        cancelText="Close"
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={assignForm} layout="vertical" onFinish={handleAssign} className="pt-2">
          <Form.Item
            name="role_ids"
            label="Roles"
            extra="ICT Support assigns project and support roles to this user."
          >
            <Select
              mode="multiple"
              allowClear
              placeholder="Select roles"
              options={roles.map((role) => ({
                value: role.id,
                label: role.description ? `${role.name} — ${role.description}` : role.name,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UserManagementPage
