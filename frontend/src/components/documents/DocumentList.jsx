import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Descriptions, Input, Modal, Space, Form, Select, message } from 'antd'
import { UploadOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import DataTable from '../common/DataTable'
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

const DOCUMENT_ACCENT = '#962c30'

function DocumentList({ embedded = false, projectId: projectIdProp = null, compact = false } = {}) {
  const { id: routeId } = useParams()
  const readOnly = isSpecReadOnlyRole(useActiveRoleName())
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState(() => {
    if (projectIdProp) {
      storeProjectId(projectIdProp)
      return projectIdProp
    }
    const fromRoute = Number(routeId)
    if (Number.isFinite(fromRoute) && fromRoute > 0) {
      storeProjectId(fromRoute)
      return fromRoute
    }
    return getStoredProjectId()
  })
  const [documents, setDocuments] = useState([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [viewTarget, setViewTarget] = useState(null)
  const [reviewForm] = Form.useForm()

  const loadProjects = useCallback(async () => {
    const fromRoute = Number(routeId)
    const embeddedId = projectIdProp || (embedded && Number.isFinite(fromRoute) && fromRoute > 0 ? fromRoute : null)
    if (embedded && embeddedId) {
      storeProjectId(embeddedId)
      setProjectId(embeddedId)
      return
    }

    const response = await api.get('/projects')
    const list = unwrapList(response.data)
    setProjects(list)
    if (Number.isFinite(fromRoute) && fromRoute > 0) {
      storeProjectId(fromRoute)
      setProjectId(fromRoute)
      return
    }
    setProjectId((current) => {
      if (current && list.some((project) => project.id === current)) return current
      const first = list[0]?.id ?? null
      storeProjectId(first)
      return first
    })
  }, [routeId, embedded, projectIdProp])

  useEffect(() => {
    if (!projectIdProp) return
    storeProjectId(projectIdProp)
    setProjectId((current) => (current === projectIdProp ? current : projectIdProp))
  }, [projectIdProp])

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

  const closeView = () => {
    setViewTarget(null)
    reviewForm.resetFields()
  }

  const submitReview = () => {
    reviewForm.validateFields().then(async (values) => {
      try {
        const response = await api.post(`/documents/${viewTarget.id}/review`, values)
        const updated = unwrapItem(response.data)
        setDocuments((prev) => prev.map((doc) => (doc.id === updated.id ? updated : doc)))
        message.success(response.data.message)
        closeView()
      } catch (err) {
        message.error(err.response?.data?.message || 'Review failed')
      }
    })
  }

  const columns = [
    { title: 'File name', dataIndex: 'file_name', key: 'file_name', width: 220 },
    { title: 'Document Type', dataIndex: 'document_type', key: 'document_type', width: 140 },
    {
      title: 'Activity Name',
      key: 'activity',
      width: 160,
      render: (_, record) => record.activity?.name || 'Project-level',
      searchValue: (record) => record.activity?.name || 'Project-level',
    },
    ...(compact
      ? []
      : [
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
        ]),
    ...(compact
      ? []
      : [
          {
            title: 'Reviewer comment',
            dataIndex: 'review_comment',
            render: (value) => value || '—',
          },
        ]),
    {
      title: 'Uploaded by',
      key: 'uploaded_by',
      width: 160,
      render: (_, record) => record.uploader?.name || '—',
      searchValue: (record) => record.uploader?.name || '',
    },
    {
      title: 'Uploaded at',
      dataIndex: 'uploaded_at',
      width: 170,
      render: (value) => (value ? dayjs(value).format('MMM D, YYYY') : '—'),
    },
    {
      title: 'Document Action',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          style={{ background: DOCUMENT_ACCENT, borderColor: DOCUMENT_ACCENT }}
          onClick={() => setViewTarget(record)}
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <div className="page-container">
      {!embedded && (
        <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-100">Project Documents</h2>
      )}

      {(!embedded || (!readOnly && !compact)) && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Space wrap>
            {!embedded && (
              <ProjectPicker
                projects={projects}
                value={projectId}
                onChange={(id) => {
                  storeProjectId(id)
                  setProjectId(id)
                }}
              />
            )}
            {!readOnly && !compact && (
              <Button type="primary" icon={<UploadOutlined />} disabled={!projectId} onClick={() => setUploadOpen(true)}>
                Upload documents
              </Button>
            )}
          </Space>
        </div>
      )}

      <DataTable
        columns={columns}
        data={documents}
        rowKey="id"
        searchPlaceholder="Search by file name or document type"
        emptyText="No current documents."
        className={compact ? 'pms-datatable-limited' : undefined}
      />

      <DocumentUploadModal
        open={uploadOpen}
        projectId={projectId}
        onCancel={() => setUploadOpen(false)}
        onUploaded={() => loadDocuments(projectId)}
      />

      <Modal
        title={viewTarget?.file_name}
        open={viewTarget !== null}
        onCancel={closeView}
        destroyOnHidden
        footer={
          readOnly
            ? [
                <Button key="close" onClick={closeView}>
                  Close
                </Button>,
              ]
            : [
                <Button
                  key="save"
                  type="primary"
                  style={{ background: DOCUMENT_ACCENT, borderColor: DOCUMENT_ACCENT }}
                  onClick={submitReview}
                >
                  Save review
                </Button>,
                <Button key="cancel" onClick={closeView}>
                  Cancel
                </Button>,
              ]
        }
      >
        <Descriptions column={1} bordered size="small" className="mb-4">
          <Descriptions.Item label="File name">{viewTarget?.file_name}</Descriptions.Item>
          <Descriptions.Item label="Type">{viewTarget?.document_type}</Descriptions.Item>
          <Descriptions.Item label="Activity">{viewTarget?.activity?.name || 'Project-level'}</Descriptions.Item>
          <Descriptions.Item label="Version">v{viewTarget?.version_number}</Descriptions.Item>
          <Descriptions.Item label="Review status">
            <ReviewStatusBadge status={viewTarget?.review_status} />
          </Descriptions.Item>
          <Descriptions.Item label="Reviewer comment">{viewTarget?.review_comment || '—'}</Descriptions.Item>
          <Descriptions.Item label="Uploaded by">{viewTarget?.uploader?.name || '—'}</Descriptions.Item>
          <Descriptions.Item label="Uploaded at">
            {viewTarget?.uploaded_at ? dayjs(viewTarget.uploaded_at).format('MMM D, YYYY h:mm A') : '—'}
          </Descriptions.Item>
        </Descriptions>

        <Button
          icon={<DownloadOutlined />}
          className="mb-4"
          onClick={() => viewTarget && downloadFile(viewTarget)}
        >
          Download
        </Button>

        {!readOnly && (
          <>
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
          </>
        )}
      </Modal>
    </div>
  )
}

export default DocumentList
