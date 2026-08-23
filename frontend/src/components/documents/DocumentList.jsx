import { useCallback, useEffect, useState } from 'react'
import { Table, Button, Input, Tooltip, Modal, Space, Form, Select, message, Alert } from 'antd'
import { UploadOutlined, DownloadOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import ReviewStatusBadge from '../common/ReviewStatusBadge'
import DocumentUploadModal from './DocumentUploadModal'
import ProjectPicker from '../common/ProjectPicker'
import { isSpecReadOnlyRole, useActiveRoleName } from '../common/RoleGuard'
import api from '../../lib/axios'
import {
  fetchAuthorizedFileUrl,
  getStoredProjectId,
  storeProjectId,
  unwrapItem,
  unwrapList,
} from '../../lib/apiHelpers'

function isPdf(doc) {
  return (doc.file_name || '').toLowerCase().endsWith('.pdf') || doc.file_type === 'application/pdf'
}

function DocumentList() {
  const readOnly = isSpecReadOnlyRole(useActiveRoleName())
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState(getStoredProjectId)
  const [documents, setDocuments] = useState([])
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [reviewTarget, setReviewTarget] = useState(null)
  const [reviewForm] = Form.useForm()

  const loadProjects = useCallback(async () => {
    const response = await api.get('/projects')
    const list = unwrapList(response.data)
    setProjects(list)
    setProjectId((current) => {
      if (current && list.some((project) => project.id === current)) return current
      const first = list[0]?.id ?? null
      storeProjectId(first)
      return first
    })
  }, [])

  const loadDocuments = useCallback(async (id) => {
    if (!id) {
      setDocuments([])
      return
    }
    const response = await api.get(`/projects/${id}/documents`)
    setDocuments(unwrapList(response.data))
  }, [])

  useEffect(() => {
    loadProjects().catch((err) => message.error(err.response?.data?.message || 'Could not load projects'))
  }, [loadProjects])

  useEffect(() => {
    loadDocuments(projectId).catch((err) => message.error(err.response?.data?.message || 'Could not load documents'))
  }, [projectId, loadDocuments])

  const openPreview = async (doc) => {
    try {
      const url = await fetchAuthorizedFileUrl(doc.id)
      setPreviewUrl(url)
      setPreviewDoc(doc)
    } catch {
      message.error('Could not preview file')
    }
  }

  const downloadFile = async (doc) => {
    try {
      const url = await fetchAuthorizedFileUrl(doc.id)
      const link = document.createElement('a')
      link.href = url
      link.download = doc.file_name
      link.click()
    } catch {
      message.error('Could not download file')
    }
  }

  const submitReview = () => {
    reviewForm.validateFields().then(async (values) => {
      try {
        const response = await api.post(`/documents/${reviewTarget.id}/review`, values)
        const updated = unwrapItem(response.data)
        setDocuments((prev) => prev.map((doc) => (doc.id === updated.id ? updated : doc)))
        message.success(response.data.message)
        setReviewTarget(null)
        reviewForm.resetFields()
      } catch (err) {
        message.error(err.response?.data?.message || 'Review failed')
      }
    })
  }

  const query = search.trim().toLowerCase()
  const filtered = documents.filter((doc) => {
    if (!query) return true
    return (
      doc.file_name?.toLowerCase().includes(query) ||
      doc.document_type?.toLowerCase().includes(query)
    )
  })

  const columns = [
    { title: 'File name', dataIndex: 'file_name', key: 'file_name' },
    { title: 'Type', dataIndex: 'document_type', key: 'document_type' },
    {
      title: 'Activity',
      key: 'activity',
      render: (_, record) => record.activity?.name || 'Project-level',
    },
    {
      title: 'Version',
      dataIndex: 'version_number',
      width: 90,
      render: (value) => `v${value}`,
    },
    {
      title: 'Review status',
      dataIndex: 'review_status',
      width: 140,
      render: (value) => <ReviewStatusBadge status={value} />,
    },
    {
      title: 'Reviewer comment',
      dataIndex: 'review_comment',
      render: (value) => value || '—',
    },
    {
      title: 'Uploaded by',
      key: 'uploaded_by',
      render: (_, record) => record.uploader?.name || '—',
    },
    {
      title: 'Uploaded at',
      dataIndex: 'uploaded_at',
      render: (value) => (value ? dayjs(value).format('MMM D, YYYY h:mm A') : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {isPdf(record) && (
            <Tooltip title="Preview">
              <Button type="text" icon={<EyeOutlined />} onClick={() => openPreview(record)} />
            </Tooltip>
          )}
          <Tooltip title="Download">
            <Button type="text" icon={<DownloadOutlined />} onClick={() => downloadFile(record)} />
          </Tooltip>
          {!readOnly && (
          <Button size="small" onClick={() => setReviewTarget(record)}>
            Review
          </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Project Documents</h2>
        <Space wrap>
          <ProjectPicker
            projects={projects}
            value={projectId}
            onChange={(id) => {
              storeProjectId(id)
              setProjectId(id)
            }}
          />
          {!readOnly && (
          <Button type="primary" icon={<UploadOutlined />} disabled={!projectId} onClick={() => setUploadOpen(true)}>
            Upload documents
          </Button>
          )}
        </Space>
      </div>

      <Alert
        className="mb-4"
        type="info"
        showIcon
        message="Reviewer can approve or return documents with comments. Returned documents block execution until resolved with a new upload."
      />

      <Input
        className="mb-4 max-w-sm"
        placeholder="Search by file name or document type"
        prefix={<SearchOutlined />}
        allowClear
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="page-shell-card p-4">
        <Table rowKey="id" className="ictms-table" columns={columns} dataSource={filtered} pagination={false} scroll={{ x: 'max-content' }} />
      </div>

      <DocumentUploadModal
        open={uploadOpen}
        projectId={projectId}
        onCancel={() => setUploadOpen(false)}
        onUploaded={() => loadDocuments(projectId)}
      />

      <Modal
        title={previewDoc?.file_name}
        open={previewDoc !== null}
        onCancel={() => {
          if (previewUrl) URL.revokeObjectURL(previewUrl)
          setPreviewDoc(null)
          setPreviewUrl(null)
        }}
        footer={null}
        width={800}
        destroyOnHidden
      >
        {previewUrl && (
          <iframe src={previewUrl} title={previewDoc?.file_name} className="h-[600px] w-full border-0" />
        )}
      </Modal>

      <Modal
        title="Review document"
        open={reviewTarget !== null}
        onOk={submitReview}
        onCancel={() => {
          setReviewTarget(null)
          reviewForm.resetFields()
        }}
        okText="Save review"
      >
        <p className="mb-3 text-sm text-gray-600">
          Returning a document requires a comment. The planner must upload a replacement before execution can start.
        </p>
        <Form form={reviewForm} layout="vertical">
          <Form.Item name="decision" label="Decision" rules={[{ required: true, message: 'Choose approve or return' }]}>
            <Select
              options={[
                { value: 'approved', label: 'Approve' },
                { value: 'returned', label: 'Return with comments' },
              ]}
            />
          </Form.Item>
          <Form.Item name="comment" label="Comment">
            <Input.TextArea rows={3} placeholder="Comments for the planner" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default DocumentList
