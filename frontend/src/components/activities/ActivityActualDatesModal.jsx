import { useEffect } from 'react'
import { Modal, Form, DatePicker, Typography } from 'antd'
import dayjs from 'dayjs'
import {
  disabledActualEndWithinPlan,
  disabledActualStartWithinPlan,
  validateActualDatesWithinPlan,
} from '../../lib/validation'
import { formatDate } from '../../lib/dates'

const { Text } = Typography

function ActivityActualDatesModal({ open, activity, onCancel, onSave }) {
  const [form] = Form.useForm()
  const actualStart = Form.useWatch('actual_start_date', form)

  useEffect(() => {
    if (!open || !activity) return
    form.setFieldsValue({
      actual_start_date: activity.actual_start_date ? dayjs(activity.actual_start_date) : null,
      actual_end_date: activity.actual_end_date ? dayjs(activity.actual_end_date) : null,
    })
  }, [open, activity, form])

  const handleOk = () => {
    form.validateFields().then((values) => {
      const actual_start_date = values.actual_start_date
        ? values.actual_start_date.format('YYYY-MM-DD')
        : null
      const actual_end_date = values.actual_end_date ? values.actual_end_date.format('YYYY-MM-DD') : null

      const validationError = validateActualDatesWithinPlan({
        actual_start_date,
        actual_end_date,
        planned_start_date: activity.planned_start_date,
        planned_end_date: activity.planned_end_date,
      })

      if (validationError) {
        form.setFields([{ name: 'actual_end_date', errors: [validationError] }])
        return
      }

      onSave({ actual_start_date, actual_end_date })
      form.resetFields()
    })
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  return (
    <Modal
      title={`Update dates — ${activity?.name ?? ''}`}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Save dates"
      destroyOnHidden
    >
      {activity && (
        <Text type="secondary" className="mb-4 block text-sm">
          Planned range: {formatDate(activity.planned_start_date)} – {formatDate(activity.planned_end_date)}
        </Text>
      )}
      <Form form={form} layout="vertical" className="mt-2">
        <Form.Item
          name="actual_start_date"
          label="Actual start"
          rules={[{ required: true, message: 'Actual start date is required' }]}
        >
          <DatePicker
            className="w-full"
            disabledDate={disabledActualStartWithinPlan(
              activity?.planned_start_date,
              activity?.planned_end_date,
            )}
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
            disabledDate={disabledActualEndWithinPlan(
              activity?.planned_start_date,
              activity?.planned_end_date,
              actualStart,
            )}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ActivityActualDatesModal
