import { useState } from 'react'
import { Table, Space, Button, Tooltip, Tag, Alert, Modal, Form, Input } from 'antd'
import {
  CheckOutlined,
  CloseOutlined,
  SyncOutlined,
  ExperimentOutlined,
  RollbackOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { STATUS } from '../../lib/status'
import StatusBadge from '../common/StatusBadge'
import TestResultBadge from '../common/TestResultBadge'
import { requirements as seedRequirements } from '../../data/requirements'
import { progressUpdates as seedProgressUpdates } from '../../data/progressUpdates'
import { getRequirementStatus } from './requirementStatus'
import RequirementProgressModal from './RequirementProgressModal'
import TestScoreModal from './TestScoreModal'
import ProgressGauge from './ProgressGauge'

const DECISION = {
  approved: { label: 'Approved', color: 'green' },
  rejected: { label: 'Rejected', color: 'red' },
  needs_revision: { label: 'Needs Revision', color: 'gold' },
}

const STATUS_FILTER_KEYS = ['not_started', 'pending', 'ongoing', 'completed']
const TEST_RESULT_FILTERS = [
  { text: 'Pass', value: 'pass' },
  { text: 'Fail', value: 'fail' },
  { text: 'Not Tested', value: 'not_tested' },
]

function TraceabilityTable() {
  const [requirements, setRequirements] = useState(seedRequirements)
  const [progressUpdates, setProgressUpdates] = useState(seedProgressUpdates)
  const [progressTarget, setProgressTarget] = useState(null)
  const [testTarget, setTestTarget] = useState(null)
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [matrixReturn, setMatrixReturn] = useState(null)
  const [returnForm] = Form.useForm()

  const handleDecision = (id, review_decision) => {
    setRequirements((prev) =>
      prev.map((requirement) => (requirement.id === id ? { ...requirement, review_decision } : requirement)),
    )
  }

  const handleSaveProgress = ({ actual_start_date, actual_end_date, remark }) => {
    const newLogEntry = {
      id: progressUpdates.length ? Math.max(...progressUpdates.map((p) => p.id)) + 1 : 1,
      entity_type: 'requirement',
      entity_id: progressTarget.id,
      actual_start_date,
      actual_end_date,
      remark,
      test_result: null,
      test_comments: null,
      status: null,
      created_at: new Date().toISOString(),
    }
    setProgressUpdates((prev) => [...prev, newLogEntry])
    setProgressTarget(null)
  }

  const handleSaveTestResult = ({ test_result, test_comments }) => {
    setRequirements((prev) =>
      prev.map((requirement) =>
        requirement.id === testTarget.id ? { ...requirement, test_result, test_comments } : requirement,
      ),
    )
    setTestTarget(null)
  }

  const handleReturnMatrix = () => {
    returnForm.validateFields().then((values) => {
      setRequirements((prev) => prev.map((requirement) => ({ ...requirement, review_decision: 'needs_revision' })))
      setMatrixReturn({ comment: values.comment.trim(), date: new Date().toISOString() })
      returnForm.resetFields()
      setReturnModalOpen(false)
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
      onFilter: (value, record) => getRequirementStatus(record.id, progressUpdates) === value,
      render: (_, record) => <StatusBadge status={getRequirementStatus(record.id, progressUpdates)} />,
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
      onFilter: (value, record) => record.test_result === value,
      render: (_, record) => <TestResultBadge result={record.test_result} />,
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">SRS Traceability Matrix</h2>
        <Button icon={<RollbackOutlined />} onClick={() => setReturnModalOpen(true)}>
          Return matrix with comments
        </Button>
      </div>

      <div className="mb-6 flex justify-center">
        <ProgressGauge requirements={requirements} progressUpdates={progressUpdates} />
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

      <Table
        rowKey="id"
        columns={columns}
        dataSource={requirements}
        scroll={{ x: 1000 }}
        pagination={false}
        rowClassName={(record) => (record.review_decision === 'rejected' ? 'bg-red-50' : '')}
      />

      <RequirementProgressModal
        open={progressTarget !== null}
        requirement={progressTarget}
        history={progressUpdates.filter(
          (update) => update.entity_type === 'requirement' && update.entity_id === progressTarget?.id,
        )}
        onCancel={() => setProgressTarget(null)}
        onSave={handleSaveProgress}
      />

      <TestScoreModal
        open={testTarget !== null}
        requirement={testTarget}
        onCancel={() => setTestTarget(null)}
        onSave={handleSaveTestResult}
      />

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
