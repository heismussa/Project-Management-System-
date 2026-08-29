import { useEffect, useState } from 'react'
import {
  Drawer,
  Descriptions,
  Form,
  DatePicker,
  Button,
  Popconfirm,
  Input,
  Timeline,
  Empty,
  Typography,
  Upload,
  Alert,
  Space,
  message,
} from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { deriveStatus } from '../../lib/status'
import { disabledActualStartDate } from '../../lib/validation'
import { formatDate } from '../../lib/dates'
import { getPersonName } from '../../data/people'
import api from '../../lib/axios'
import StatusBadge from '../common/StatusBadge'
import PreventMutation from '../common/PreventMutation'

const { Text } = Typography
const { Dragger } = Upload

function personLookup(people, id) {
  return people?.find((person) => person.id === id)
}

function ActivityReviewDrawer({
  open,
  activity,
  people,
  history,
  onClose,
  onSaveActualStart,
  onMarkComplete,
  onAddRemark,
  onApproveChange,
  onRejectChange,
  onSubmitForReview,
}) {
  const [form] = Form.useForm()
  const actualStart = Form.useWatch('actual_start_date', form)
  const remarkText = Form.useWatch('remark', form) ?? ''
  const [savingStart, setSavingStart] = useState(false)
  const [addingRemark, setAddingRemark] = useState(false)
  const [marking, setMarking] = useState(false)
  const [approvingChange, setApprovingChange] = useState(false)
  const [rejectingChange, setRejectingChange] = useState(false)
  const [submittingProgress, setSubmittingProgress] = useState(false)

  useEffect(() => {
    if (!open || !activity) return
    form.setFieldsValue({
      actual_start_date: activity.actual_start_date ? dayjs(activity.actual_start_date) : null,
      remark: '',
    })
  }, [open, activity, form])

  if (!activity) return null

  const status = deriveStatus(activity)
  const isCompleted = status === 'completed'
  const canMarkComplete = Boolean(activity.actual_start_date) && !activity.actual_end_date
  const startUnchanged =
    (actualStart ? actualStart.format('YYYY-MM-DD') : null) === (activity.actual_start_date ?? null)

  const handleSaveActualStart = async () => {
    try {
      const values = await form.validateFields()
      setSavingStart(true)
      await onSaveActualStart(values.actual_start_date.format('YYYY-MM-DD'))
    } finally {
      setSavingStart(false)
    }
  }

  const handleMarkComplete = async () => {
    setMarking(true)
    try {
      await onMarkComplete()
    } finally {
      setMarking(false)
    }
  }

  const handleAddRemark = async () => {
    const trimmed = remarkText.trim()
    if (!trimmed) return
    setAddingRemark(true)
    try {
      await onAddRemark(trimmed)
      form.setFieldValue('remark', '')
    } finally {
      setAddingRemark(false)
    }
  }

  const hasPendingChange = activity.plan_change_status === 'pending'

  const handleApproveChange = async () => {
    setApprovingChange(true)
    try {
      await onApproveChange(activity)
    } finally {
      setApprovingChange(false)
    }
  }

  const handleRejectChange = async () => {
    setRejectingChange(true)
    try {
      await onRejectChange(activity)
    } finally {
      setRejectingChange(false)
    }
  }

  const progressReviewStatus = activity.progress_review_status
  const canSubmitProgress = progressReviewStatus !== 'pending'

  const handleSubmitForReview = async () => {
    setSubmittingProgress(true)
    try {
      await onSubmitForReview(activity)
    } finally {
      setSubmittingProgress(false)
    }
  }

  const handleDocumentUpload = async ({ file, onSuccess, onError }) => {
    if (!activity?.project_id) {
      onError?.(new Error('Missing project'))
      message.error('Cannot upload: activity is missing project_id.')
      return
    }
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('project_id', activity.project_id)
      formData.append('activity_id', activity.id)
      formData.append('document_type', 'Activity Evidence')
      await api.post('/documents', formData)
      onSuccess?.(file)
      message.success(`"${file.name}" uploaded.`)
    } catch (err) {
      onError?.(err)
      message.error(err.response?.data?.message || 'Upload failed.')
    }
  }

  const sortedHistory = [...(history ?? [])].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  )

  return (
    <Drawer
      title={`Review — ${activity.name}`}
      open={open}
      onClose={onClose}
      width={480}
      destroyOnHidden
    >
      {hasPendingChange && (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message="Plan change pending approval"
          description={
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Text>
                The planning details for this activity were edited and are awaiting reviewer approval. The
                current plan stays in effect until this change is approved.
              </Text>
              <PreventMutation fallback={null}>
                <Space>
                  <Button type="primary" loading={approvingChange} onClick={handleApproveChange}>
                    Approve change
                  </Button>
                  <Button danger loading={rejectingChange} onClick={handleRejectChange}>
                    Reject change
                  </Button>
                </Space>
              </PreventMutation>
            </Space>
          }
        />
      )}

      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Activity Done">{activity.name}</Descriptions.Item>
        <Descriptions.Item label="Planned Start">{formatDate(activity.planned_start_date)}</Descriptions.Item>
        <Descriptions.Item label="Planned End">{formatDate(activity.planned_end_date)}</Descriptions.Item>
        <Descriptions.Item label="Actual End">{formatDate(activity.actual_end_date)}</Descriptions.Item>
        <Descriptions.Item label="Expected Deliverable">{activity.expected_deliverable}</Descriptions.Item>
        <Descriptions.Item label="Responsible Person">
          {personLookup(people, activity.responsible_person_id)?.name ??
            getPersonName(activity.responsible_person_id)}
        </Descriptions.Item>
        <Descriptions.Item label="Project Status">
          <StatusBadge status={status} />
        </Descriptions.Item>
      </Descriptions>

      <PreventMutation
        fallback={
          <Alert
            className="mt-5"
            type="info"
            showIcon
            message="Read-only access"
            description="Your role can view this activity but cannot change dates, remarks, or documents."
          />
        }
      >
      <div className="mt-5">
        <Text strong>Actual Start</Text>
        <Form form={form} layout="inline" className="mt-2">
          <Form.Item
            name="actual_start_date"
            rules={[{ required: true, message: 'Actual start date is required' }]}
            style={{ flex: 1, marginRight: 8 }}
          >
            <DatePicker
              className="w-full"
              disabled={isCompleted}
              disabledDate={disabledActualStartDate(activity.planned_start_date)}
            />
          </Form.Item>
          <Button
            type="primary"
            disabled={isCompleted || startUnchanged}
            loading={savingStart}
            onClick={handleSaveActualStart}
          >
            Save
          </Button>
        </Form>
      </div>

      <div className="mt-5">
        <Popconfirm
          title="Mark this activity complete?"
          description={`This records today's date (${dayjs().format('MMM D, YYYY')}) as the Actual End and cannot be edited afterwards.`}
          okText="Mark Complete"
          onConfirm={handleMarkComplete}
          disabled={!canMarkComplete}
        >
          <Button type="primary" danger={false} disabled={!canMarkComplete} loading={marking} block>
            Mark Complete
          </Button>
        </Popconfirm>
      </div>

      <div className="mt-6">
        <Text strong>Remarks</Text>
        <Form form={form} component={false}>
          <Form.Item name="remark" noStyle>
            <Input.TextArea
              rows={2}
              className="mt-2"
              placeholder="Add a remark about this activity..."
            />
          </Form.Item>
        </Form>
        <div className="mt-2 flex justify-end">
          <Button onClick={handleAddRemark} loading={addingRemark} disabled={!remarkText.trim()}>
            Add remark
          </Button>
        </div>

        <div className="mt-4 max-h-52 overflow-y-auto pr-1">
          {sortedHistory.length === 0 ? (
            <Empty description="No remarks yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Timeline
              items={sortedHistory.map((entry) => ({
                key: entry.id,
                content: (
                  <>
                    <Text type="secondary" className="block text-xs">
                      {dayjs(entry.created_at).format('MMM D, YYYY h:mm A')}
                    </Text>
                    <Text>{entry.remark}</Text>
                  </>
                ),
              }))}
            />
          )}
        </div>
      </div>

      <div className="mt-6">
        <Text strong>Documents</Text>
        {!isCompleted && (
          <Text type="secondary" className="mt-1 block text-xs">
            Documents can be attached once this activity is marked complete.
          </Text>
        )}
        <Dragger multiple disabled={!isCompleted} customRequest={handleDocumentUpload} className="mt-2">
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag files to this area to upload</p>
        </Dragger>
      </div>

      <div className="mt-6">
        {progressReviewStatus === 'pending' && (
          <Alert
            className="mb-3"
            type="info"
            showIcon
            message="Submitted — awaiting reviewer approval"
          />
        )}
        {progressReviewStatus === 'approved' && (
          <Alert className="mb-3" type="success" showIcon message="Reviewer approved this progress update" />
        )}
        {progressReviewStatus === 'rejected' && (
          <Alert
            className="mb-3"
            type="error"
            showIcon
            message="Reviewer rejected this progress update"
            description={activity.progress_review_comment || undefined}
          />
        )}
        <Button
          type="primary"
          block
          loading={submittingProgress}
          disabled={!canSubmitProgress}
          onClick={handleSubmitForReview}
        >
          Submit
        </Button>
      </div>
      </PreventMutation>
    </Drawer>
  )
}

export default ActivityReviewDrawer
