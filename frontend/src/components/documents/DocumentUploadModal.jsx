import { useState } from 'react'
import { Modal, Upload, Typography, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import api from '../../utility/api'

const { Dragger } = Upload
const { Text } = Typography

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.doc', '.xls', '.png', '.jpg', '.zip']
const MAX_FILE_SIZE_MB = 20

function inferDocumentType(fileName) {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.pdf')) return 'PDF Document'
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'Word Document'
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'Excel Document'
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'Image'
  if (lower.endsWith('.zip')) return 'Archive'
  return 'Document'
}

function DocumentUploadModal({ open, onCancel, onUpload, projectId = 1, activityId = null, requirementId = null }) {
  const [fileList, setFileList] = useState([])

  const handleBeforeUpload = (file) => {
    const extensionOk = ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
    if (!extensionOk) {
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
    const formData = new FormData()
    formData.append('file', file)
    formData.append('project_id', projectId)
    if (activityId) formData.append('activity_id', activityId)
    if (requirementId) formData.append('requirement_id', requirementId)
    formData.append('title', file.name)
    formData.append('document_type', inferDocumentType(file.name))

    try {
      const response = await api.post('/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (event) => {
          if (event.total) {
            const percent = Math.round((event.loaded * 100) / event.total)
            onProgress({ percent })
          }
        },
      })

      const createdDoc = response.data?.document || response.data
      onSuccess(createdDoc, file)
      message.success(`${file.name} uploaded successfully`)

      if (onUpload) {
        onUpload(createdDoc)
      }
    } catch (error) {
      console.error('Document upload error:', error)
      onError(error)
      const errorMsg = error.response?.data?.message || `Failed to upload ${file.name}`
      message.error(errorMsg)
    }
  }

  const handleChange = ({ fileList: next }) => {
    setFileList(next)
  }

  const handleModalClose = () => {
    setFileList([])
    if (onCancel) onCancel()
  }

  return (
    <Modal
      title="Upload documents"
      open={open}
      onCancel={handleModalClose}
      footer={null}
      destroyOnClose
    >
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