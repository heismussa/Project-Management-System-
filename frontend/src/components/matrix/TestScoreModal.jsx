import { useEffect } from 'react'
import { Modal, Form, Radio, Input } from 'antd'

function TestScoreModal({ open, requirement, onCancel, onSave }) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (!open || !requirement) return
    form.setFieldsValue({
      test_result: requirement.test_result === 'not_tested' ? null : requirement.test_result,
      test_comments: requirement.test_comments,
    })
  }, [open, requirement, form])

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSave({
        test_result: values.test_result,
        test_comments: values.test_comments ?? null,
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
      title={`Record test result — ${requirement?.requirement_code ?? ''}`}
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
        <Form.Item
          name="test_result"
          label="Test result"
          rules={[{ required: true, message: 'Select a test result' }]}
        >
          <Radio.Group buttonStyle="solid">
            <Radio.Button value="pass">Pass</Radio.Button>
            <Radio.Button value="fail">Fail</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item name="test_comments" label="Test comments">
          <Input.TextArea rows={3} placeholder="What was tested and what happened?" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default TestScoreModal
