import { useState } from 'react'
import { Modal, Form, Input, Button, Space } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'

const BLANK_ROW = { requirement_code: '', description: '' }

function BulkRequirementForm({ open, onCancel, onSubmit }) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      setSubmitting(true)
      try {
        await onSubmit(values.rows)
        form.resetFields()
      } finally {
        setSubmitting(false)
      }
    })
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  return (
    <Modal
      title="Add requirements"
      open={open}
      onOk={handleOk}
      confirmLoading={submitting}
      onCancel={handleCancel}
      okText="Add requirements"
      width={640}
      destroyOnHidden
    >
      <p className="mb-3 text-sm text-gray-600">
        Each row starts as <strong>Pending</strong> — implementation status is derived from progress
        updates, never set directly.
      </p>
      <Form form={form} layout="vertical" initialValues={{ rows: [BLANK_ROW] }}>
        <Form.List name="rows">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Space key={field.key} align="start" style={{ display: 'flex', marginBottom: 8 }}>
                  <Form.Item
                    {...field}
                    name={[field.name, 'requirement_code']}
                    rules={[{ required: true, message: 'Code required' }]}
                    style={{ marginBottom: 0, width: 140 }}
                  >
                    <Input placeholder="REQ-00X" />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'description']}
                    rules={[{ required: true, message: 'Description required' }]}
                    style={{ marginBottom: 0, width: 380 }}
                  >
                    <Input placeholder="Requirement description" />
                  </Form.Item>
                  {fields.length > 1 && (
                    <MinusCircleOutlined
                      className="mt-2 text-red-500"
                      onClick={() => remove(field.name)}
                      aria-label="Remove row"
                    />
                  )}
                </Space>
              ))}
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="dashed" onClick={() => add({ ...BLANK_ROW })} icon={<PlusOutlined />} block>
                  Add row
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  )
}

export default BulkRequirementForm
