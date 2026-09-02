import { useState } from 'react'
import { Button, Form, Input, Modal, Typography, Upload, message } from 'antd'
import { InboxOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import api from '../../lib/axios'
import { extractUploadFile } from '../../lib/projectDocuments'

const { Dragger } = Upload
const { Text } = Typography
const MAROON = '#800000'

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.xlsx']
const MAX_FILE_SIZE_MB = 10

function validateFile(file) {
  const extensionOk = ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
  if (!extensionOk) {
    message.error(`${file.name} is not a supported file type`)
    return Upload.LIST_IGNORE
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    message.error(`${file.name} exceeds the ${MAX_FILE_SIZE_MB}MB limit`)
    return Upload.LIST_IGNORE
  }
  return false
}

/** Add RTM: upload the (required) SRS document and seed the requirements
 * traceability matrix with one or more requirement rows. */
function AddRtmModal({ open, projectId, onClose, onAdded }) {
  const [form] = Form.useForm()
  const [srsFile, setSrsFile] = useState([])
  const [saving, setSaving] = useState(false)

  const handleClose = () => {
    form.resetFields()
    setSrsFile([])
    onClose?.()
  }

  const handleSubmit = () => {
    form.validateFields().then(async (values) => {
      const file = extractUploadFile(srsFile[0])
      if (!file) {
        message.error('Attach the SRS document before saving.')
        return
      }

      setSaving(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('project_id', projectId)
        formData.append('document_type', 'SRS')
        await api.post('/documents', formData)

        for (const row of values.requirements) {
          await api.post('/requirements', {
            project_id: projectId,
            requirement_code: row.requirement_code,
            description: row.description,
          })
        }

        message.success('RTM added')
        handleClose()
        onAdded?.()
      } catch (err) {
        message.error(err.response?.data?.message || 'Could not add the RTM.')
      } finally {
        setSaving(false)
      }
    })
  }

  return (
    <Modal
      title={<span style={{ color: MAROON, fontWeight: 700 }}>Add RTM</span>}
      open={open}
      onCancel={handleClose}
      destroyOnHidden
      width={720}
      centered
      confirmLoading={saving}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button type="primary" style={{ backgroundColor: MAROON, borderColor: MAROON }} loading={saving} onClick={handleSubmit}>
            Add
          </Button>
          <Button onClick={handleClose}>Close</Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" className="mt-2" initialValues={{ requirements: [{ requirement_code: '', description: '' }] }}>
        <Form.Item
          label={
            <span>
              SRS document <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
          }
          validateStatus={srsFile.length === 0 ? 'error' : undefined}
        >
          <Dragger
            multiple={false}
            fileList={srsFile}
            beforeUpload={validateFile}
            onChange={({ fileList: next }) => setSrsFile(next)}
            accept={ACCEPTED_EXTENSIONS.join(',')}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag the SRS document here</p>
          </Dragger>
        </Form.Item>

        <div className="mb-2 mt-4 text-sm font-semibold" style={{ color: MAROON }}>
          RTM requirements
        </div>
        <Form.List name="requirements">
          {(fields, { add, remove }) => (
            <div className="flex flex-col gap-3">
              {fields.map((field) => (
                <div key={field.key} className="flex items-start gap-2 rounded border border-gray-200 p-3">
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                    <Form.Item
                      {...field}
                      name={[field.name, 'requirement_code']}
                      label="Requirement code"
                      rules={[{ required: true, message: 'Code is required' }]}
                      className="mb-0 sm:w-48"
                    >
                      <Input placeholder="e.g. REQ-001" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'description']}
                      label="Description"
                      rules={[{ required: true, message: 'Description is required' }]}
                      className="mb-0 flex-1"
                    >
                      <Input.TextArea rows={1} placeholder="Functional or technical requirement" />
                    </Form.Item>
                  </div>
                  {fields.length > 1 && (
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(field.name)}
                      className="mt-6"
                    />
                  )}
                </div>
              ))}
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ requirement_code: '', description: '' })}>
                Add requirement row
              </Button>
            </div>
          )}
        </Form.List>
        <Text type="secondary" className="mt-2 block text-xs">
          Each row becomes one requirement in the project's traceability matrix.
        </Text>
      </Form>
    </Modal>
  )
}

export default AddRtmModal
