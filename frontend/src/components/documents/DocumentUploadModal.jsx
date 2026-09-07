import { useState } from 'react'
import { Modal, Upload, Typography, Select, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import api from '../../lib/axios'

const { Dragger } = Upload
const { Text } = Typography

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.xlsx']
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const MAX_FILE_SIZE_MB = 10

const DOCUMENT_TYPES = ['Implementation Plan', 'SRS', 'Survey Report', 'Cost Estimate', 'Other']

function DocumentUploadModal({ open, projectId, activityId = null, onCancel, onUploaded }) {
  const [fileList, setFileList] = useState([])
  const [documentType, setDocumentType] = useState('Implementation Plan')

  const handleBeforeUpload = (file) => {
    const extensionOk = ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
    const mimeOk = !file.type || ACCEPTED_MIME_TYPES.includes(file.type)
    if (!extensionOk && !mimeOk) {
      message.error(`${file.name} is not a supported file type`)
      return Upload.LIST_IGNORE
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      message.error(`${file.name} exceeds the ${MAX_FILE_SIZE_MB}MB limit`)
      return Upload.LIST_IGNORE
    }
    return true
  }

  const handleCustomRequest = async ({ file, onProgress, onSuccess, onError }) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('project_id', projectId)
      if (activityId) formData.append('activity_id', activityId)
      formData.append('document_type', documentType)
      onProgress({ percent: 40 })
      const response = await api.post('/documents', formData)
      onProgress({ percent: 100 })
      onSuccess(response.data)
      onUploaded?.(response.data?.data)
      message.success('Document uploaded')
    } catch (err) {
      onError(err)
      message.error(err.response?.data?.message || 'Upload failed')
    }
  }

  return (
    <Modal
      title="Upload documents"
      open={open}
      onCancel={() => {
        setFileList([])
        onCancel()
      }}
      footer={null}
      destroyOnHidden
    >
      <div className="mb-3">
        <Text strong className="mb-1 block">Document type</Text>
        <Select
          className="w-full"
          value={documentType}
          onChange={setDocumentType}
          options={DOCUMENT_TYPES.map((type) => ({ value: type, label: type }))}
        />
        <Text type="secondary" className="mt-1 block text-xs">
          Required for execution: Implementation Plan and SRS.
        </Text>
      </div>
      <Dragger
        multiple
        fileList={fileList}
        beforeUpload={handleBeforeUpload}
        customRequest={handleCustomRequest}
        onChange={({ fileList: next }) => setFileList(next)}
        accept={ACCEPTED_EXTENSIONS.join(',')}
        disabled={!projectId}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Click or drag files to this area to upload</p>
        <Text type="secondary">
          Supports PDF, DOCX and XLSX files, up to {MAX_FILE_SIZE_MB}MB each
        </Text>
      </Dragger>
    </Modal>
  )
}

export default DocumentUploadModal
