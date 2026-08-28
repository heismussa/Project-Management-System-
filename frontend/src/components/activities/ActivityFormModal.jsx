import { useEffect } from 'react'
import { Modal, Form, Input, DatePicker, Select } from 'antd'
import dayjs from 'dayjs'

function ActivityFormModal({ open, activity, people, onCancel, onSave }) {
  const [form] = Form.useForm()
  const isCreate = activity?.id == null

  useEffect(() => {
    if (!open || !activity) return
    form.setFieldsValue({
      name: activity.name,
      expected_deliverable: activity.expected_deliverable,
      plannedRange: [
        activity.planned_start_date ? dayjs(activity.planned_start_date) : null,
        activity.planned_end_date ? dayjs(activity.planned_end_date) : null,
      ],
      responsible_person_id: activity.responsible_person_id,
    })
  }, [open, activity, form])

  const handleOk = () => {
    form.validateFields().then((values) => {
      const [plannedStart, plannedEnd] = values.plannedRange
      onSave({
        name: values.name,
        expected_deliverable: values.expected_deliverable,
        planned_start_date: plannedStart.format('YYYY-MM-DD'),
        planned_end_date: plannedEnd.format('YYYY-MM-DD'),
        responsible_person_id: values.responsible_person_id,
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
      okText="Submit"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="mt-4" autoComplete="off">
        <Form.Item
          name="name"
          label="Activity name"
          rules={[{ required: true, message: 'Activity name is required' }]}
        >
          <Input placeholder="e.g. Foundation excavation" autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="expected_deliverable"
          label="Expected Deliverable"
          rules={[{ required: true, message: 'Expected deliverable is required' }]}
        >
          <Input.TextArea rows={2} placeholder="e.g. Excavated foundation trench" autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="plannedRange"
          label="Planned Start / Planned End"
          rules={[{ required: true, message: 'Planned start and end dates are required' }]}
        >
          <DatePicker.RangePicker className="w-full" />
        </Form.Item>
        <Form.Item
          name="responsible_person_id"
          label="Responsible Person"
          rules={[{ required: true, message: 'Responsible person is required' }]}
        >
          <Select
            placeholder="Select a team member"
            options={people.map((person) => ({ value: person.id, label: person.name }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ActivityFormModal
