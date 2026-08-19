import { useCallback, useEffect, useState } from 'react'
import { Table, Space, Button, Tooltip, Tag, Alert, Modal, Form, Input, Spin, message } from 'antd'
import {
  CheckOutlined,
  CloseOutlined,
  SyncOutlined,
  ExperimentOutlined,
  RollbackOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { STATUS } from '../../lib/status'
import StatusBadge from '../common/StatusBadge'
import TestResultBadge from '../common/TestResultBadge'
import ProjectPicker from '../common/ProjectPicker'
import { getRequirementStatus } from './requirementStatus'
import RequirementProgressModal from './RequirementProgressModal'
import TestScoreModal from './TestScoreModal'
import ProgressGauge from './ProgressGauge'
import api from '../../lib/axios'
import {
  apiStatusToUi,
  apiTestResultToUi,
  datesToImplementationStatus,
  getStoredProjectId,
  storeProjectId,
  uiTestResultToApi,
  unwrapItem,
  unwrapList,
} from '../../lib/apiHelpers'

const DECISION = {
  approved: { label: 'Approved', color: 'green' },
  rejected: { label: 'Rejected', color: 'red' },
  needs_revision: { label: 'Needs Revision', color: 'gold' },
}

const STATUS_FILTER_KEYS = ['pending', 'ongoing', 'completed']
const TEST_RESULT_FILTERS = [
  { text: 'Pass', value: 'pass' },
  { text: 'Fail', value: 'fail' },
  { text: 'Not Tested', value: 'not_tested' },
]

function normalizeRequirement(requirement) {
  return {
    ...requirement,
    ui_status: apiStatusToUi(requirement.implementation_status),
    test_result_ui: apiTestResultToUi(requirement.test_result),
  }
}

function TraceabilityTable() {
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState(getStoredProjectId)
  const [requirements, setRequirements] = useState([])
  const [overallProgress, setOverallProgress] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progressTarget, setProgressTarget] = useState(null)
  const [testTarget, setTestTarget] = useState(null)
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [matrixReturn, setMatrixReturn] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [returnForm] = Form.useForm()
  const [addForm] = Form.useForm()

  const loadProjects = useCallback(async () => {
    try {
      const response = await api.get('/projects')
      const projectList = unwrapList(response.data)
      setProjects(projectList)
      setProjectId((current) => {
        if (current && projectList.some((project) => project.id === current)) return current
        const first = projectList[0]?.id ?? null
        storeProjectId(first)
        return first
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load projects.')
    }
  }, [])

  const loadMatrix = useCallback(async (id) => {
    if (!id) {
      setRequirements([])
      setOverallProgress(null)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [reqRes, progressRes] = await Promise.all([
        api.get(`/projects/${id}/requirements`),
        api.get(`/projects/${id}/progress`),
      ])
      setRequirements(unwrapList(reqRes.data).map(normalizeRequirement))
      setOverallProgress(progressRes.data?.overall_progress ?? null)
    } catch (err) {
      setRequirements([])
      setError(err.response?.data?.message || 'Could not load requirements.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    loadMatrix(projectId)
  }, [projectId, loadMatrix])

  const applyUpdatedRequirement = (updated, score) => {
    const normalized = normalizeRequirement(updated)
    setRequirements((prev) => prev.map((requirement) => (requirement.id === normalized.id ? { ...requirement, ...normalized } : requirement)))
    if (score != null) setOverallProgress(score)
  }

  const handleDecision = (id, review_decision) => {
    setRequirements((prev) =>
      prev.map((requirement) => (requirement.id === id ? { ...requirement, review_decision } : requirement)),
    )
  }

  const handleSaveProgress = async ({ actual_start_date, actual_end_date, remark }) => {
    try {
      const response = await api.patch(`/requirements/${progressTarget.id}/status`, {
        implementation_status: datesToImplementationStatus({ actual_start_date, actual_end_date }),
        remarks: remark,
      })
      applyUpdatedRequirement(unwrapItem(response.data), response.data?.overall_implementation_score)
      setProgressTarget(null)
      message.success('Requirement status updated')
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not update status.')
    }
  }

  const handleSaveTestResult = async ({ test_result, test_comments }) => {
    try {
      const response = await api.patch(`/requirements/${testTarget.id}/status`, {
        implementation_status: testTarget.implementation_status || 'Pending',
        test_result: uiTestResultToApi(test_result),
        remarks: test_comments,
      })
      applyUpdatedRequirement(unwrapItem(response.data), response.data?.overall_implementation_score)
      setTestTarget(null)
      message.success('Test result saved')
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not save test result.')
    }
  }

  const handleReturnMatrix = () => {
    returnForm.validateFields().then((values) => {
      setRequirements((prev) => prev.map((requirement) => ({ ...requirement, review_decision: 'needs_revision' })))
      setMatrixReturn({ comment: values.comment.trim(), date: new Date().toISOString() })
      returnForm.resetFields()
      setReturnModalOpen(false)
    })
  }

  const handleAddRequirement = () => {
    addForm.validateFields().then(async (values) => {
      try {
        const response = await api.post('/requirements', {
          project_id: projectId,
          requirement_code: values.requirement_code,
          description: values.description,
        })
        const created = normalizeRequirement(unwrapItem(response.data))
        setRequirements((prev) => [...prev, created])
        addForm.resetFields()
        setAddOpen(false)
        message.success('Requirement added')
        const progressRes = await api.get(`/projects/${projectId}/progress`)
        setOverallProgress(progressRes.data?.overall_progress ?? null)
      } catch (err) {
        message.error(err.response?.data?.message || 'Could not add requirement.')
      }
    })
  }

  const columns = [
    {
      title: 'Code',
      dataIndex: 'requirement_code',
      key: 'requirement_code',
      fixed: 'left',
      width: 110,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Status',
      key: 'status',
      width: 150,
      filters: STATUS_FILTER_KEYS.map((key) => ({ text: STATUS[key].label, value: key })),
      onFilter: (value, record) => (record.ui_status || getRequirementStatus(record.id, [])) === value,
      render: (_, record) => <StatusBadge status={record.ui_status || 'pending'} />,
    },
    {
      title: 'Review decision',
      key: 'review_decision',
      width: 150,
      render: (_, record) => {
        const decision = DECISION[record.review_decision]
        return decision ? <Tag color={decision.color}>{decision.label}</Tag> : <Tag>Not reviewed</Tag>
      },
    },
    {
      title: 'Test result',
      key: 'test_result',
      width: 130,
      filters: TEST_RESULT_FILTERS,
      onFilter: (value, record) => (record.test_result_ui || 'not_tested') === value,
      render: (_, record) => <TestResultBadge result={record.test_result_ui} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space>
          <Tooltip title="Approve">
            <Button
              type="text"
              icon={<CheckOutlined />}
              disabled={record.review_decision === 'approved'}
              onClick={() => handleDecision(record.id, 'approved')}
            />
          </Tooltip>
          <Tooltip title="Reject">
            <Button
              type="text"
              danger
              icon={<CloseOutlined />}
              disabled={record.review_decision === 'rejected'}
              onClick={() => handleDecision(record.id, 'rejected')}
            />
          </Tooltip>
          <Tooltip title="Update progress">
            <Button type="text" icon={<SyncOutlined />} onClick={() => setProgressTarget(record)} />
          </Tooltip>
          <Tooltip title="Record test result">
            <Button type="text" icon={<ExperimentOutlined />} onClick={() => setTestTarget(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-800">SRS Traceability Matrix</h2>
        <Space wrap>
          <ProjectPicker projects={projects} value={projectId} onChange={(id) => { storeProjectId(id); setProjectId(id) }} />
          <Button type="primary" icon={<PlusOutlined />} disabled={!projectId} onClick={() => setAddOpen(true)}>
            Add requirement
          </Button>
          <Button icon={<RollbackOutlined />} onClick={() => setReturnModalOpen(true)}>
            Return matrix with comments
          </Button>
        </Space>
      </div>

      {error && <Alert className="mb-4" type="error" showIcon message={error} />}

      <div className="mb-6 flex justify-center">
        <ProgressGauge requirements={requirements} progressUpdates={[]} overallProgress={overallProgress} />
      </div>

      {matrixReturn && (
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          message="Matrix returned for revision"
          description={`"${matrixReturn.comment}" — ${dayjs(matrixReturn.date).format('MMM D, YYYY h:mm A')}`}
          closable
          onClose={() => setMatrixReturn(null)}
        />
      )}

      <Spin spinning={loading}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={requirements}
          scroll={{ x: 1000 }}
          pagination={false}
          rowClassName={(record) => (record.review_decision === 'rejected' ? 'bg-red-50' : '')}
        />
      </Spin>

      <RequirementProgressModal
        open={progressTarget !== null}
        requirement={progressTarget}
        history={[]}
        onCancel={() => setProgressTarget(null)}
        onSave={handleSaveProgress}
      />

      <TestScoreModal
        open={testTarget !== null}
        requirement={testTarget ? { ...testTarget, test_result: testTarget.test_result_ui } : null}
        onCancel={() => setTestTarget(null)}
        onSave={handleSaveTestResult}
      />

      <Modal
        title="Add requirement"
        open={addOpen}
        onOk={handleAddRequirement}
        onCancel={() => {
          addForm.resetFields()
          setAddOpen(false)
        }}
        okText="Add"
        destroyOnHidden
      >
        <Form form={addForm} layout="vertical" className="mt-4">
          <Form.Item
            name="requirement_code"
            label="Requirement code"
            rules={[{ required: true, message: 'Code is required' }]}
          >
            <Input placeholder="e.g. REQ-001" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Description is required' }]}
          >
            <Input.TextArea rows={3} placeholder="Functional or technical requirement" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Return matrix with comments"
        open={returnModalOpen}
        onOk={handleReturnMatrix}
        onCancel={() => {
          returnForm.resetFields()
          setReturnModalOpen(false)
        }}
        okText="Return matrix"
        destroyOnHidden
      >
        <p className="mb-3 text-sm text-gray-600">
          This marks every requirement in the matrix as needing revision and records your comment for the team.
        </p>
        <Form form={returnForm} layout="vertical">
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

export default TraceabilityTable
