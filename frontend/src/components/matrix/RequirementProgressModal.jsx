import { useEffect } from 'react'
import { Modal, Form, DatePicker, Input, Timeline, Empty, Typography } from 'antd'
import dayjs from 'dayjs'
import { disabledActualStartDate, disabledActualEndDate } from '../../lib/validation'

const { Text } = Typography

function RequirementProgressModal({ open, requirement, history, plannedStartDate, onCancel, onSave }) {
  const [form] = Form.useForm()
  const actualStart = Form.useWatch('actual_start_date', form)

  useEffect(() => {
    if (!open || !requirement) return
    const latest = [...(history ?? [])].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    )[0]
    form.setFieldsValue({
      actual_start_date: latest?.actual_start_date ? dayjs(latest.actual_start_date) : null,
      actual_end_date: latest?.actual_end_date ? dayjs(latest.actual_end_date) : null,
      remark: '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, requirement, form])

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSave({
        actual_start_date: values.actual_start_date ? values.actual_start_date.format('YYYY-MM-DD') : null,
        actual_end_date: values.actual_end_date ? values.actual_end_date.format('YYYY-MM-DD') : null,
        remark: values.remark.trim(),
      })
      form.resetFields()
    })
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  const sortedHistory = [...(history ?? [])].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  )

  return (
    <Modal
      title={`Update progress — ${requirement?.requirement_code ?? ''}`}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Save update"
      footer={(_, { OkBtn, CancelBtn }) => (
        <>
          <OkBtn />
          <CancelBtn />
        </>
      )}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item name="actual_start_date" label="Actual start">
          <DatePicker
            className="w-full"
            disabledDate={disabledActualStartDate(plannedStartDate)}
            onChange={(value) => {
              if (!value) form.setFieldValue('actual_end_date', null)
            }}
          />
        </Form.Item>
        <Form.Item
          name="actual_end_date"
          label="Actual end"
          tooltip={!actualStart ? 'Set an actual start date first' : undefined}
        >
          <DatePicker
            className="w-full"
            disabled={!actualStart}
            disabledDate={disabledActualEndDate(actualStart)}
          />
        </Form.Item>
        <Form.Item
          name="remark"
          label="Remark"
          rules={[{ required: true, message: 'Add a remark describing this update' }]}
        >
          <Input.TextArea rows={3} placeholder="What changed since the last update?" />
        </Form.Item>
      </Form>

      <div className="mt-2">
        <Text strong>History</Text>
        <div className="mt-3 max-h-52 overflow-y-auto pr-1">
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
    </Modal>
  )
}

export default RequirementProgressModal
