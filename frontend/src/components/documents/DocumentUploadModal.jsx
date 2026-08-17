import { useState } from 'react'
import { Modal, Upload, Typography, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'

const { Dragger } = Upload
const { Text } = Typography

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.xlsx']
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const MAX_FILE_SIZE_MB = 10
const CURRENT_USER_ID = 1 // placeholder until auth exists

function inferDocumentType(fileName) {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.pdf')) return 'PDF Document'
  if (lower.endsWith('.docx')) return 'Word Document'
  if (lower.endsWith('.xlsx')) return 'Excel Document'
  return 'Document'
}

function DocumentUploadModal({ open, onCancel, onUpload }) {
  const [fileList, setFileList] = useState([])

  const handleBeforeUpload = (file) => {
    const extensionOk = ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
    const mimeOk = ACCEPTED_MIME_TYPES.includes(file.type)
    if (!extensionOk || !mimeOk) {
      message.error(`${file.name} is not a supported file type`)
      return Upload.LIST_IGNORE
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      message.error(`${file.name} exceeds the ${MAX_FILE_SIZE_MB}MB limit`)
      return Upload.LIST_IGNORE
    }
    return true
  }

  // No real backend yet — simulate progress so the Dragger's built-in
  // progress bar has something to animate, then resolve with a blob URL.
  const handleCustomRequest = ({ file, onProgress, onSuccess }) => {
    let percent = 0
    const timer = setInterval(() => {
      percent = Math.min(percent + 20, 100)
      onProgress({ percent })
      if (percent >= 100) {
        clearInterval(timer)
        onSuccess({ url: URL.createObjectURL(file) }, file)
      }
    }, 150)
  }

  const handleChange = ({ file, fileList: next }) => {
    setFileList(next)
    if (file.status === 'done') {
      onUpload({
        project_id: 1,
        activity_id: null,
        requirement_id: null,
        document_type: inferDocumentType(file.name),
        file_name: file.name,
        file_url: file.response.url,
        file_type: file.type,
        file_size: file.size,
        version_number: 1,
        is_current: true,
        review_status: 'pending',
        uploaded_by: CURRENT_USER_ID,
        uploaded_at: new Date().toISOString(),
      })
    }
  }

  return (
    <Modal title="Upload documents" open={open} onCancel={onCancel} footer={null} destroyOnHidden>
      <Dragger
        multiple
        fileList={fileList}
        beforeUpload={handleBeforeUpload}
        customRequest={handleCustomRequest}
        onChange={handleChange}
        accept={ACCEPTED_EXTENSIONS.join(',')}
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
