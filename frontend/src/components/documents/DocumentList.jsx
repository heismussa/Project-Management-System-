import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Input, Tooltip, Modal, Space, message } from 'antd'
import { UploadOutlined, DownloadOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import ReviewStatusBadge from '../common/ReviewStatusBadge'
import DocumentUploadModal from './DocumentUploadModal'
import api from '../../utility/api'

function getStreamUrl(docId) {
  const baseURL = api.defaults?.baseURL || '/api'
  return `${baseURL}/documents/${docId}/stream`
}

function isPdf(doc) {
  const name = doc.title || doc.file_name || ''
  const type = doc.file_type || ''
  return name.toLowerCase().endsWith('.pdf') || type.toLowerCase().includes('pdf')
}

function DocumentList({ projectId }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (projectId) params.project_id = projectId
      if (search.trim()) params.search = search.trim()

      const response = await api.get('/documents', { params })
      setDocuments(response.data || [])
    } catch (error) {
      console.error('Failed to fetch documents:', error)
      message.error('Failed to load documents list')
    } finally {
      setLoading(false)
    }
  }, [projectId, search])

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchDocuments()
    }, 300)
    return () => clearTimeout(timeout)
  }, [fetchDocuments])

  const handleUploadSuccess = (newDoc) => {
    if (newDoc) {
      setDocuments((prev) => [newDoc, ...prev])
    } else {
      fetchDocuments()
    }
  }

  const columns = [
    {
      title: 'File name',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => text || record.file_name || 'Untitled Document',
    },
    {
      title: 'Type',
      dataIndex: 'document_type',
      key: 'document_type',
      render: (text) => text || 'General',
    },
    {
      title: 'Version',
      dataIndex: 'version_number',
      key: 'version_number',
      width: 90,
      render: (value) => `v${value || 1}`,
    },
    {
      title: 'Review status',
      dataIndex: 'review_status',
      key: 'review_status',
      width: 140,
      render: (value) => <ReviewStatusBadge status={value || 'pending'} />,
    },
    {
      title: 'Uploaded by',
      dataIndex: 'uploaded_by',
      key: 'uploaded_by',
      render: (_, record) => record.uploaded_by?.name || record.uploadedBy?.name || 'System User',
    },
    {
      title: 'Uploaded at',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value, record) => {
        const dateVal = value || record.uploaded_at
        return dateVal ? dayjs(dateVal).format('MMM D, YYYY h:mm A') : '-'
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const streamUrl = getStreamUrl(record.id)
        return (
          <Space>
            {isPdf(record) && (
              <Tooltip title="Preview">
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={() => setPreviewDoc({ ...record, streamUrl })}
                />
              </Tooltip>
            )}
            <Tooltip title="Download">
              <Button
                type="text"
                icon={<DownloadOutlined />}
                href={streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={record.title || record.file_name}
              />
            </Tooltip>
          </Space>
        )
      },
    },
  ]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-800">Project Documents</h2>
        <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadOpen(true)}>
          Upload documents
        </Button>
      </div>

      <Input
        className="mb-4 max-w-sm"
        placeholder="Search by file name or document type"
        prefix={<SearchOutlined />}
        allowClear
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <Table
        rowKey="id"
        columns={columns}
        dataSource={documents}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <DocumentUploadModal
        open={uploadOpen}
        projectId={projectId || 1}
        onCancel={() => setUploadOpen(false)}
        onUpload={handleUploadSuccess}
      />

      <Modal
        title={previewDoc?.title || previewDoc?.file_name}
        open={previewDoc !== null}
        onCancel={() => setPreviewDoc(null)}
        footer={null}
        width={800}
        destroyOnClose
      >
        {previewDoc && (
          <iframe
            src={previewDoc.streamUrl}
            title={previewDoc.title || previewDoc.file_name}
            className="h-150 w-full border-0"
          />
        )}
      </Modal>
    </div>
  )
}

export default DocumentList