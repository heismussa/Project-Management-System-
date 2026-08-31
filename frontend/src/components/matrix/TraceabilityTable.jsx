import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Table, Space, Button, Popover, Tag, Alert, Modal, Form, Input, Spin, Divider, message } from 'antd'
import {
  CheckOutlined,
  CloseOutlined,
  SyncOutlined,
  ExperimentOutlined,
  RollbackOutlined,
  PlusOutlined,
  MoreOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { STATUS } from '../../lib/status'
import StatusBadge from '../common/StatusBadge'
import TestResultBadge from '../common/TestResultBadge'
import ProjectPicker from '../common/ProjectPicker'
import { isSpecReadOnlyRole, useActiveRoleName } from '../common/RoleGuard'
import { getRequirementStatus } from './requirementStatus'
import RequirementProgressModal from './RequirementProgressModal'
import TestScoreModal from './TestScoreModal'
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

function TraceabilityTable({ embedded = false } = {}) {
  const { id: routeId } = useParams()
  const roleName = useActiveRoleName()
  const readOnly = isSpecReadOnlyRole(roleName)
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState(() => {
    const fromRoute = Number(routeId)
    if (Number.isFinite(fromRoute) && fromRoute > 0) {
      storeProjectId(fromRoute)
      return fromRoute
    }
    return getStoredProjectId()
  })
  const [requirements, setRequirements] = useState([])
  const [matrixReturn, setMatrixReturn] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progressTarget, setProgressTarget] = useState(null)
  const [testTarget, setTestTarget] = useState(null)
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [actionsOpenId, setActionsOpenId] = useState(null)
  const [returnForm] = Form.useForm()
  const [addForm] = Form.useForm()

  const loadProjects = useCallback(async () => {
    try {
      const fromRoute = Number(routeId)
      if (embedded && Number.isFinite(fromRoute) && fromRoute > 0) {
        storeProjectId(fromRoute)
        setProjectId(fromRoute)
        return
      }

      const response = await api.get('/projects')
      const projectList = unwrapList(response.data)
      setProjects(projectList)
      if (Number.isFinite(fromRoute) && fromRoute > 0) {
        storeProjectId(fromRoute)
        setProjectId(fromRoute)
        return
      }
      setProjectId((current) => {
        if (current && projectList.some((project) => project.id === current)) return current
        const first = projectList[0]?.id ?? null
        storeProjectId(first)
        return first
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load projects.')
    }
  }, [routeId, embedded])

  const loadMatrix = useCallback(async (id) => {
    if (!id) {
      setRequirements([])
      return
    }
    setLoading(true)
    setError('')
    try {
      const [reqRes, workflowRes] = await Promise.all([
        api.get(`/projects/${id}/requirements`),
        api.get(`/projects/${id}/workflow`),
      ])
      setRequirements(unwrapList(reqRes.data).map(normalizeRequirement))
      const workflow = workflowRes.data?.data
      if (workflow?.matrix_return_comment) {
        setMatrixReturn({ comment: workflow.matrix_return_comment, date: workflow.matrix_returned_at })
      } else {
        setMatrixReturn(null)
      }
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

  const applyUpdatedRequirement = (updated) => {
    const normalized = normalizeRequirement(updated)
    setRequirements((prev) => prev.map((requirement) => (requirement.id === normalized.id ? { ...requirement, ...normalized } : requirement)))
  }

  const handleDecision = async (id, review_decision) => {
    setActionsOpenId(null)
    try {
      const response = await api.patch(`/requirements/${id}/review`, { review_decision })
      const updated = unwrapItem(response.data)
      setRequirements((prev) =>
        prev.map((requirement) => (requirement.id === updated.id ? { ...requirement, ...normalizeRequirement(updated) } : requirement)),
      )
      message.success(review_decision === 'approved' ? 'Requirement approved' : 'Requirement rejected')
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not save review decision.')
    }
  }

  const handleSaveProgress = async ({ actual_start_date, actual_end_date, remark }) => {
    try {
      const response = await api.patch(`/requirements/${progressTarget.id}/status`, {
        actual_start_date,
        actual_end_date,
        implementation_status: datesToImplementationStatus({ actual_start_date, actual_end_date }),
        remarks: remark,
      })
      applyUpdatedRequirement(unwrapItem(response.data))
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
      applyUpdatedRequirement(unwrapItem(response.data))
      setTestTarget(null)
      message.success('Test result saved')
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not save test result.')
    }
  }

  const handleReturnMatrix = () => {
    returnForm.validateFields().then(async (values) => {
      try {
        const response = await api.post(`/projects/${projectId}/matrix/return`, {
          comment: values.comment.trim(),
        })
        const returned = unwrapList(response.data?.data?.requirements).map(normalizeRequirement)
        if (returned.length) setRequirements(returned)
        else {
          setRequirements((prev) => prev.map((requirement) => ({ ...requirement, review_decision: 'needs_revision' })))
        }
        setMatrixReturn({
          comment: response.data?.data?.comment || values.comment.trim(),
          date: response.data?.data?.returned_at || new Date().toISOString(),
        })
        returnForm.resetFields()
        setReturnModalOpen(false)
        message.success('Matrix returned to planner')
      } catch (err) {
        message.error(err.response?.data?.message || 'Could not return matrix.')
      }
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
      } catch (err) {
        message.error(err.response?.data?.message || 'Could not add requirement.')
      }
    })
  }

  const columns = [
    {
      title: 'SN',
      key: 'sn',
      fixed: 'left',
      width: 56,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Code',
      dataIndex: 'requirement_code',
      key: 'requirement_code',
      fixed: 'left',
      width: 110,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      filters: STATUS_FILTER_KEYS.map((key) => ({ text: STATUS[key].label, value: key })),
      onFilter: (value, record) => (record.ui_status || getRequirementStatus(record.id, [])) === value,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (_, record) => <StatusBadge status={record.ui_status || 'pending'} />,
    },
    {
      title: 'Score',
      dataIndex: 'score_percent',
      key: 'score_percent',
      width: 80,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (value) => `${value ?? 0}%`,
    },
    {
      title: 'Review decision',
      key: 'review_decision',
      width: 150,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (_, record) => {
        const decision = DECISION[record.review_decision]
        return decision ? <Tag color={decision.color}>{decision.label}</Tag> : <Tag>Not reviewed</Tag>
      },
    },
    {
      title: 'Test result',
      key: 'test_result',
      width: 120,
      filters: TEST_RESULT_FILTERS,
      onFilter: (value, record) => (record.test_result_ui || 'not_tested') === value,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (_, record) => <TestResultBadge result={record.test_result_ui} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 80,
      align: 'center',
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (_, record) =>
        readOnly ? (
          <span className="text-gray-400">View only</span>
        ) : (
          <Popover
            trigger="click"
            placement="bottomRight"
            arrow={{ pointAtCenter: true }}
            open={actionsOpenId === record.id}
            onOpenChange={(open) => setActionsOpenId(open ? record.id : null)}
            content={
              <div className="w-[220px]">
                <Space size="small" className="mb-1">
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckOutlined />}
                    disabled={record.review_decision === 'approved'}
                    onClick={() => handleDecision(record.id, 'approved')}
                  >
                    Approve
                  </Button>
                  <Button
                    danger
                    size="small"
                    icon={<CloseOutlined />}
                    disabled={record.review_decision === 'rejected'}
                    onClick={() => handleDecision(record.id, 'rejected')}
                  >
                    Reject
                  </Button>
                </Space>
                <Divider className="!my-2" />
                <Space direction="vertical" size={4} className="w-full">
                  <Button
                    type="text"
                    block
                    className="!justify-start"
                    icon={<SyncOutlined />}
                    onClick={() => {
                      setActionsOpenId(null)
                      setProgressTarget(record)
                    }}
                  >
                    Update progress
                  </Button>
                  <Button
                    type="text"
                    block
                    className="!justify-start"
                    icon={<ExperimentOutlined />}
                    onClick={() => {
                      setActionsOpenId(null)
                      setTestTarget(record)
                    }}
                  >
                    Record test result
                  </Button>
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
        <Space wrap>
          {!embedded && (
            <ProjectPicker projects={projects} value={projectId} onChange={(id) => { storeProjectId(id); setProjectId(id) }} />
          )}
          {!readOnly && (
            <>
              <Button type="primary" icon={<PlusOutlined />} disabled={!projectId} onClick={() => setAddOpen(true)}>
                Add requirement
              </Button>
              <Button icon={<RollbackOutlined />} onClick={() => setReturnModalOpen(true)}>
                Return matrix with comments
              </Button>
            </>
          )}
        </Space>
      </div>

      {error && <Alert className="mb-4" type="error" showIcon message={error} />}

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
        <div className="page-shell-card p-0">
          <Table
            className="matrix-table pms-house-table"
            rowKey="id"
            columns={columns}
            dataSource={requirements}
            scroll={{ x: 'max-content' }}
            pagination={false}
            rowClassName={(record) => (record.review_decision === 'rejected' ? 'bg-red-50 dark:bg-red-950/30' : '')}
          />
        </div>
      </Spin>

      <RequirementProgressModal
        open={progressTarget !== null}
        requirement={progressTarget}
        plannedStartDate={projects.find((project) => project.id === projectId)?.planned_start_date}
        history={(progressTarget?.progress_updates || []).map((entry) => ({
          ...entry,
          remark: entry.remark,
        }))}
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
        footer={(_, { OkBtn, CancelBtn }) => (
          <>
            <OkBtn />
            <CancelBtn />
          </>
        )}
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
        footer={(_, { OkBtn, CancelBtn }) => (
          <>
            <OkBtn />
            <CancelBtn />
          </>
        )}
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