import { useState } from 'react'
import { Table, Button, Input, Tooltip, Modal, Space } from 'antd'
import { UploadOutlined, DownloadOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import ReviewStatusBadge from '../common/ReviewStatusBadge'
import DocumentUploadModal from './DocumentUploadModal'
import { documents as seedDocuments } from '../../data/documents'
import { getPersonName } from '../../data/people'

function isPdf(doc) {
  return doc.file_name.toLowerCase().endsWith('.pdf')
}

function DocumentList() {
  const [documents, setDocuments] = useState(seedDocuments)
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState(null)

  const handleUpload = (fileMeta) => {
    setDocuments((prev) => {
      const newId = prev.length ? Math.max(...prev.map((d) => d.id)) + 1 : 1
      return [{ id: newId, ...fileMeta }, ...prev]
    })
  }

  const query = search.trim().toLowerCase()
  const filtered = documents.filter((doc) => {
    if (!query) return true
    return (
      doc.file_name.toLowerCase().includes(query) || doc.document_type.toLowerCase().includes(query)
    )
  })

  const columns = [
    { title: 'File name', dataIndex: 'file_name', key: 'file_name' },
    { title: 'Type', dataIndex: 'document_type', key: 'document_type' },
    {
      title: 'Version',
      dataIndex: 'version_number',
      key: 'version_number',
      width: 90,
      render: (value) => `v${value}`,
    },
    {
      title: 'Review status',
      dataIndex: 'review_status',
      key: 'review_status',
      width: 140,
      render: (value) => <ReviewStatusBadge status={value} />,
    },
    {
      title: 'Uploaded by',
      dataIndex: 'uploaded_by',
      key: 'uploaded_by',
      render: getPersonName,
    },
    {
      title: 'Uploaded at',
      dataIndex: 'uploaded_at',
      key: 'uploaded_at',
      render: (value) => dayjs(value).format('MMM D, YYYY h:mm A'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {isPdf(record) && (
            <Tooltip title={record.file_url ? 'Preview' : 'No file to preview'}>
              <Button
                type="text"
                icon={<EyeOutlined />}
                disabled={!record.file_url}
                onClick={() => setPreviewDoc(record)}
              />
            </Tooltip>
          )}
          <Tooltip title={record.file_url ? 'Download' : 'No file to download'}>
            <Button
              type="text"
              icon={<DownloadOutlined />}
              disabled={!record.file_url}
              href={record.file_url ?? undefined}
              download={record.file_name}
            />
          </Tooltip>
        </Space>
      ),
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

      <Table rowKey="id" columns={columns} dataSource={filtered} pagination={false} />

      <DocumentUploadModal open={uploadOpen} onCancel={() => setUploadOpen(false)} onUpload={handleUpload} />

      <Modal
        title={previewDoc?.file_name}
        open={previewDoc !== null}
        onCancel={() => setPreviewDoc(null)}
        footer={null}
        width={800}
        destroyOnHidden
      >
        {previewDoc && (
          <iframe
            src={previewDoc.file_url}
            title={previewDoc.file_name}
            className="h-[600px] w-full border-0"
          />
        )}
      </Modal>
    </div>
  )
}

export default DocumentList
