import { Modal, Table, Button, Space, message } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import ReviewStatusBadge from '../common/ReviewStatusBadge'
import DocumentUploadModal from '../documents/DocumentUploadModal'
import api from '../../lib/axios'
import { unwrapList } from '../../lib/apiHelpers'

function ActivityDocumentsModal({ open, activity, projectId, onCancel }) {
  const [documents, setDocuments] = useState([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!open || !projectId || !activity?.id) return
    setLoading(true)
    try {
      const response = await api.get(`/projects/${projectId}/documents`, {
        params: { activity_id: activity.id },
      })
      setDocuments(unwrapList(response.data))
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not load documents')
    } finally {
      setLoading(false)
    }
  }, [open, projectId, activity?.id])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <Modal
        title={`Documents — ${activity?.name || ''}`}
        open={open}
        onCancel={onCancel}
        footer={null}
        width={800}
      >
        <div className="mb-3 flex justify-end">
          <Button type="primary" onClick={() => setUploadOpen(true)}>
            Upload document
          </Button>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          pagination={false}
          dataSource={documents}
          columns={[
            { title: 'File', dataIndex: 'file_name' },
            { title: 'Type', dataIndex: 'document_type' },
            {
              title: 'Review',
              dataIndex: 'review_status',
              render: (value) => <ReviewStatusBadge status={value} />,
            },
            {
              title: 'Uploaded',
              dataIndex: 'uploaded_at',
              render: (value) => (value ? dayjs(value).format('MMM D, YYYY') : '—'),
            },
          ]}
        />
      </Modal>
      <DocumentUploadModal
        open={uploadOpen}
        projectId={projectId}
        activityId={activity?.id}
        onCancel={() => setUploadOpen(false)}
        onUploaded={() => {
          setUploadOpen(false)
          load()
        }}
      />
    </>
  )
}

export default ActivityDocumentsModal
