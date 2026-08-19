import { useEffect } from 'react'
import { Modal, Form, Input, DatePicker, Select } from 'antd'
import dayjs from 'dayjs'

function PlanningModal({ open, activity, onCancel, onSave }) {
  const [form] = Form.useForm()
  const isCreate = activity?.id == null

  useEffect(() => {
    if (!open || !activity) return
    form.setFieldsValue({
      name: activity.name,
      deliverable: activity.deliverable,
      plannedRange: [
        activity.plannedStart ? dayjs(activity.plannedStart) : null,
        activity.plannedEnd ? dayjs(activity.plannedEnd) : null,
      ],
      team: activity.team,
    })
  }, [open, activity, form])

  const handleOk = () => {
    form.validateFields().then((values) => {
      const [plannedStart, plannedEnd] = values.plannedRange
      onSave({
        name: values.name,
        deliverable: values.deliverable,
        plannedStart: plannedStart.format('YYYY-MM-DD'),
        plannedEnd: plannedEnd.format('YYYY-MM-DD'),
        team: values.team,
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
      title={isCreate ? 'Add activity' : 'Edit planning details'}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Save"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          name="name"
          label="Activity name"
          rules={[{ required: true, message: 'Activity name is required' }]}
        >
          <Input placeholder="e.g. Foundation excavation" />
        </Form.Item>
        <Form.Item
          name="deliverable"
          label="Expected deliverable"
          rules={[{ required: true, message: 'Expected deliverable is required' }]}
        >
          <Input.TextArea rows={2} placeholder="e.g. Excavated foundation trench" />
        </Form.Item>
        <Form.Item
          name="plannedRange"
          label="Planned start / end"
          rules={[{ required: true, message: 'Planned start and end dates are required' }]}
        >
          <DatePicker.RangePicker className="w-full" />
        </Form.Item>
        <Form.Item
          name="team"
          label="Assigned team members"
          rules={[{ required: true, message: 'Assign at least one team member' }]}
        >
          <Select mode="tags" placeholder="Type a name and press enter" tokenSeparators={[',']} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default PlanningModal
