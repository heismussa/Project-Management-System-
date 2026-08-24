import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, DatePicker, Form, Input, InputNumber, Select, message } from 'antd'
import api from '../lib/axios'
import { unwrapItem, unwrapList } from '../lib/apiHelpers'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../utility/Config.jsx'
import {
  PROJECT_CATEGORIES,
  PROJECT_TYPES,
  REVIEW_TRACKS,
  TEAM_TYPES,
  activitiesForCategory,
  optionsFrom,
} from '../lib/projectCatalog'
import InitiationDocumentsPanel from '../components/projects/InitiationDocumentsPanel'

function usersWithRole(users, roleName) {
  const matched = users.filter((user) => (user.roles || []).some((role) => role.name === roleName))
  return matched.length ? matched : users
}

export default function ProjectRegistration() {
  const [form] = Form.useForm()
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [project, setProject] = useState(null)
  const category = Form.useWatch('category', form)
  const activityOptions = useMemo(() => optionsFrom(activitiesForCategory(category)), [category])

  useEffect(() => {
    api
      .get('/users')
      .then((response) => setUsers(unwrapList(response.data)))
      .catch(() => setError('Could not load users for planner assignment.'))
  }, [])

  const planners = useMemo(() => usersWithRole(users, ROLES.PPL), [users])
  const coordinators = useMemo(() => usersWithRole(users, ROLES.PCO), [users])
  const approvers = useMemo(() => usersWithRole(users, ROLES.PAP), [users])

  const userOptions = (list) =>
    list.map((item) => ({
      value: item.id,
      label: `${item.name} (${item.email})`,
    }))

  const handleFinish = async (values) => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...values,
        planned_start_date: values.planned_start_date?.format('YYYY-MM-DD'),
        planned_end_date: values.planned_end_date?.format('YYYY-MM-DD'),
        initiation_document_id: values.initiation_document_id || null,
      }
      const response = await api.post('/projects', payload)
      setProject(unwrapItem(response.data))
      message.success('Project registered. Attach the initiation documents below before proceeding to Planning.')
    } catch (err) {
      if (err.response?.status === 422) {
        const errors = err.response.data.errors || {}
        const firstKey = Object.keys(errors)[0]
        setError(errors[firstKey]?.[0] || 'Validation failed.')
      } else if (err.response?.status === 403) {
        setError('Only a Project Reviewer can register a project.')
      } else {
        setError(err.response?.data?.message || 'Project registration failed.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-[80%] max-w-none">
      <Card>
        {error && (
          <Alert className="mb-4" type="error" showIcon message={error} />
        )}
        {!user?.permissions?.includes('projects.register') && (
          <Alert
            className="mb-4"
            type="warning"
            showIcon
            message="Your active account is missing the projects.register permission."
          />
        )}

        {project && (
          <Alert
            className="mb-4"
            type="success"
            showIcon
            message={`"${project.name}" registered.`}
            description="Attach the initiation documents below, then proceed to Planning once every required document is attached."
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          disabled={Boolean(project)}
          initialValues={{
            category: 'System',
            project_type: 'New Implementation',
            activity_name: activitiesForCategory('System')[0],
            team_type: 'Internal',
            review_track: 'SDMM',
          }}
        >
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item
              name="annual_plan_reference"
              label="Annual Plan Reference"
              rules={[{ required: true, message: 'APR reference is required' }]}
            >
              <Input placeholder="NSSF-2026-APR-001" />
            </Form.Item>
            <Form.Item name="name" label="Project Name" rules={[{ required: true, message: 'Name is required' }]}>
              <Input placeholder="Member Portal Upgrade" />
            </Form.Item>
            <Form.Item name="category" label="Category" rules={[{ required: true }]}>
              <Select
                options={optionsFrom(PROJECT_CATEGORIES)}
                onChange={(value) => form.setFieldValue('activity_name', activitiesForCategory(value)[0])}
              />
            </Form.Item>
            <Form.Item name="project_type" label="Project Type" rules={[{ required: true }]}>
              <Select options={optionsFrom(PROJECT_TYPES)} />
            </Form.Item>
            <Form.Item name="activity_name" label="Activity" rules={[{ required: true }]}>
              <Select options={activityOptions} />
            </Form.Item>
            <Form.Item name="review_track" label="Review Track" rules={[{ required: true }]}>
              <Select options={REVIEW_TRACKS} />
            </Form.Item>
            <Form.Item name="team_type" label="Implementation Team">
              <Select options={optionsFrom(TEAM_TYPES)} allowClear />
            </Form.Item>
            <Form.Item name="planner_id" label="Planner" rules={[{ required: true, message: 'Assign a planner' }]}>
              <Select showSearch optionFilterProp="label" options={userOptions(planners)} placeholder="Select planner" />
            </Form.Item>
            <Form.Item name="coordinator_id" label="Coordinator (optional)">
              <Select showSearch allowClear optionFilterProp="label" options={userOptions(coordinators)} />
            </Form.Item>
            <Form.Item name="approver_id" label="Approver (optional)">
              <Select showSearch allowClear optionFilterProp="label" options={userOptions(approvers)} />
            </Form.Item>
            <Form.Item name="planned_start_date" label="Planned Start">
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="planned_end_date" label="Planned End">
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="budget" label="Budget (optional)">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
            <Form.Item name="initiation_document_id" label="Initiation Document ID">
              <InputNumber className="w-full" min={1} placeholder="Optional" />
            </Form.Item>
          </div>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving} disabled={Boolean(project)}>
            Register
          </Button>
        </Form>
      </Card>

      <Card className="mt-4">
        <InitiationDocumentsPanel projectId={project?.id ?? null} />
      </Card>
    </div>
  )
}
