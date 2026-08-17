import { useEffect } from 'react'
import { Modal, Form, Input, DatePicker, Timeline, Empty, Typography } from 'antd'
import dayjs from 'dayjs'

const { Text } = Typography

function ProgressModal({ open, activity, onCancel, onSave }) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (!open || !activity) return
    form.setFieldsValue({
      actualStart: activity.actualStart ? dayjs(activity.actualStart) : null,
      actualEnd: activity.actualEnd ? dayjs(activity.actualEnd) : null,
      remark: '',
    })
  }, [open, activity, form])

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSave({
        actualStart: values.actualStart ? values.actualStart.format('YYYY-MM-DD') : null,
        actualEnd: values.actualEnd ? values.actualEnd.format('YYYY-MM-DD') : null,
        remark: values.remark.trim(),
      })
      form.resetFields()
    })
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  const remarks = activity ? [...activity.remarks].reverse() : []

  return (
    <Modal
      title="Update progress"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Save update"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item name="actualStart" label="Actual start">
          <DatePicker className="w-full" />
        </Form.Item>
        <Form.Item
          name="actualEnd"
          label="Actual end"
          dependencies={['actualStart']}
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value) return Promise.resolve()
                const actualStart = getFieldValue('actualStart')
                if (!actualStart) {
                  return Promise.reject(new Error('Set an actual start date first'))
                }
                if (value.isBefore(actualStart, 'day')) {
                  return Promise.reject(new Error('Actual end cannot be before actual start'))
                }
                return Promise.resolve()
              },
            }),
          ]}
        >
          <DatePicker className="w-full" />
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
          {remarks.length === 0 ? (
            <Empty description="No remarks yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Timeline
              items={remarks.map((remark) => ({
                key: remark.id,
                content: (
                  <>
                    <Text type="secondary" className="block text-xs">
                      {dayjs(remark.date).format('MMM D, YYYY h:mm A')}
                    </Text>
                    <Text>{remark.text}</Text>
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

export default ProgressModal
