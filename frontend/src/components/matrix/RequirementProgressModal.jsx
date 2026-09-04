import { useEffect } from 'react'
import { Modal, Form, DatePicker, Input } from 'antd'
import dayjs from 'dayjs'
import { disabledActualStartDate } from '../../lib/validation'

/** Records when work on a requirement actually began. The end date isn't
 * captured here — like activities, it's auto-stamped by a separate
 * "Mark complete" action instead of being manually picked. */
function RequirementStartModal({ open, requirement, plannedStartDate, onCancel, onSave }) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (!open || !requirement) return
    form.setFieldsValue({
      actual_start_date: requirement.actual_start_date ? dayjs(requirement.actual_start_date) : dayjs(),
      remark: '',
    })
  }, [open, requirement, form])

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSave({
        actual_start_date: values.actual_start_date.format('YYYY-MM-DD'),
        remark: values.remark.trim(),
      })
      form.resetFields()
    })
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  return (
    <Modal
      title={`Start requirement — ${requirement?.requirement_code ?? ''}`}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Save"
      footer={(_, { OkBtn, CancelBtn }) => (
        <>
          <OkBtn />
          <CancelBtn />
        </>
      )}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item name="actual_start_date" label="Actual start" rules={[{ required: true, message: 'Pick a start date' }]}>
          <DatePicker className="w-full" disabledDate={disabledActualStartDate(plannedStartDate)} />
        </Form.Item>
        <Form.Item
          name="remark"
          label="Remark"
          rules={[{ required: true, message: 'Add a remark describing this update' }]}
        >
          <Input.TextArea rows={3} placeholder="What's starting, and any relevant detail?" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default RequirementStartModal
