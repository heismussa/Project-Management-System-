import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Steps, message } from 'antd'
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

const DETAIL_FIELDS = [
  'name',
  'category',
  'project_type',
  'activity_name',
  'review_track',
  'planner_id',
]

function usersWithRole(users, roleName) {
  const matched = users.filter((user) => (user.roles || []).some((role) => role.name === roleName))
  return matched.length ? matched : users
}

export default function ProjectRegistration() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState('')
  const [project, setProject] = useState(null)
  const [step, setStep] = useState(0)
  const category = Form.useWatch('category', form)
  const activityOptions = useMemo(() => optionsFrom(activitiesForCategory(category)), [category])

  useEffect(() => {
    api
      .get('/users')
      .then((response) => setUsers(unwrapList(response.data)))
      .catch(() => setError('Could not load users for planner assignment.'))
  }, [])

  const closeRegistration = () => {
    if (project?.id) {
      message.info(`"${project.name}" is saved — you can finish registration later from Project Management.`)
      navigate('/projects')
      return
    }

    Modal.confirm({
      title: 'Close without saving?',
      content: 'Nothing has been saved yet — the details entered so far will be lost.',
      okText: 'Close',
      okButtonProps: { danger: true },
      cancelText: 'Keep editing',
      onOk: () => navigate('/projects'),
    })
  }

  const planners = useMemo(() => usersWithRole(users, ROLES.PPL), [users])
  const coordinators = useMemo(() => usersWithRole(users, ROLES.PCO), [users])
  const approvers = useMemo(() => usersWithRole(users, ROLES.PAP), [users])

  const userOptions = (list) =>
    list.map((item) => ({
      value: item.id,
      label: `${item.name} (${item.email})`,
    }))

  /** Step 1 → Step 2: validate details, create the project so documents can be attached. */
  const goToDocuments = async () => {
    try {
      await form.validateFields(DETAIL_FIELDS)
    } catch {
      return
    }

    if (project?.id) {
      setError('')
      setStep(1)
      return
    }

    setSaving(true)
    setError('')
    try {
      const { plannedRange, ...values } = form.getFieldsValue(true)
      const [plannedStart, plannedEnd] = plannedRange || []
      const payload = {
        ...values,
        annual_plan_reference: values.annual_plan_reference || null,
        planned_start_date: plannedStart ? plannedStart.format('YYYY-MM-DD') : null,
        planned_end_date: plannedEnd ? plannedEnd.format('YYYY-MM-DD') : null,
        initiation_document_id: values.initiation_document_id || null,
      }
      const response = await api.post('/projects', payload)
      setProject(unwrapItem(response.data))
      setStep(1)
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

  /** Step 2 final action: advance to planning, then return to Ongoing projects list. */
  const finishRegistration = async () => {
    if (!project?.id) {
      setError('Complete Details & assignment first.')
      setStep(0)
      return
    }

    setFinishing(true)
    setError('')
    try {
      await api.post(`/projects/${project.id}/advance-to-planning`)
      navigate('/projects', {
        replace: true,
        state: {
          registeredProjectId: project.id,
          registeredProjectName: project.name,
        },
      })
    } catch (err) {
      if (err.response?.status === 422) {
        const errors = err.response.data.errors || {}
        const firstKey = Object.keys(errors)[0]
        setError(
          errors[firstKey]?.[0] ||
            err.response?.data?.message ||
            'Attach required initiation documents before finishing.',
        )
      } else {
        setError(err.response?.data?.message || 'Could not complete registration.')
      }
    } finally {
      setFinishing(false)
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

        <Steps
          className="mb-6"
          current={step}
          items={[
            { title: 'Details & assignment' },
            { title: 'Initiation documents' },
          ]}
        />

        {project && step === 1 && (
          <Alert
            className="mb-4"
            type="info"
            showIcon
            message={`"${project.name}" saved.`}
            description="Attach the required initiation documents below, then click Register project. Completing registration advances the project into Planning."
          />
        )}

        <Form
          form={form}
          layout="vertical"
          disabled={Boolean(project)}
          preserve
          initialValues={{
            category: 'System',
            project_type: 'New Implementation',
            activity_name: activitiesForCategory('System')[0],
            team_type: 'Internal',
            review_track: 'SDMM',
          }}
        >
          {step === 0 && (
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
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
              <Form.Item name="budget" label="Budget (optional)">
                <InputNumber className="w-full" min={0} />
              </Form.Item>

              <Form.Item name="plannedRange" label="Planned Start / Planned End" className="sm:col-span-2">
                <DatePicker.RangePicker className="w-full" />
              </Form.Item>

              <Form.Item name="description" label="Description" className="sm:col-span-2">
                <Input.TextArea rows={3} />
              </Form.Item>

              <div className="sm:col-span-2 flex justify-end">
                <Space>
                  <Button type="primary" loading={saving} onClick={goToDocuments}>
                    Next
                  </Button>
                  <Button onClick={closeRegistration}>Close</Button>
                </Space>
              </div>
            </div>
          )}
        </Form>

        {step === 1 && (
          <div className="mt-2">
            <InitiationDocumentsPanel projectId={project?.id ?? null} hideProceed />
            <div className="mt-6 flex justify-end">
              <Space>
                <Button type="primary" loading={finishing} disabled={!project?.id} onClick={finishRegistration}>
                  Register project
                </Button>
                <Button onClick={() => setStep(0)}>Back</Button>
                <Button onClick={closeRegistration}>Close</Button>
              </Space>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
