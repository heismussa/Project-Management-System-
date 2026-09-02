import { useCallback, useEffect, useState } from 'react'
import { Button, Collapse, Descriptions, Modal, Select, Spin, Table, Tag, message } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import api from '../../lib/axios'
import { fetchAuthorizedFileUrl, unwrapList } from '../../lib/apiHelpers'
import { formatDate } from '../../lib/dates'

const MAROON = '#800000'
const PRIMARY_BTN = { backgroundColor: MAROON, borderColor: MAROON }

/**
 * Coordinator's "Recommend execution" flow: project details as an inline
 * dropdown, the activity list and documents, and a Recommend action that
 * opens a small track-selection popup (SDMM / IDMM) before submitting.
 */
export default function CoordinatorRecommendationModal({ open, project, onClose, onCompleted }) {
  const [loading, setLoading] = useState(false)
  const [activities, setActivities] = useState([])
  const [documents, setDocuments] = useState([])
  const [activityTarget, setActivityTarget] = useState(null)
  const [trackModalOpen, setTrackModalOpen] = useState(false)
  const [track, setTrack] = useState('SDMM')
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    if (!project?.id) {
      setActivities([])
      setDocuments([])
      return
    }
    setLoading(true)
    try {
      const [activitiesRes, documentsRes] = await Promise.all([
        api.get(`/projects/${project.id}/activities`),
        api.get(`/projects/${project.id}/documents`),
      ])
      setActivities(unwrapList(activitiesRes.data))
      setDocuments(unwrapList(documentsRes.data))
    } catch {
      setActivities([])
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }, [project])

  useEffect(() => {
    if (!open) return
    loadData()
    setTrack(project?.workflow?.review_track || project?.review_track || 'SDMM')
    setActivityTarget(null)
    setTrackModalOpen(false)
  }, [open, project, loadData])

  const viewDocument = async (doc) => {
    try {
      const url = await fetchAuthorizedFileUrl(doc.id)
      window.open(url, '_blank', 'noopener')
    } catch {
      message.error('Could not open document.')
    }
  }

  const submitRecommend = async () => {
    if (!project?.id) return
    setSaving(true)
    try {
      await api.post(`/projects/${project.id}/recommend`, { review_track: track })
      message.success('Project recommended for execution.')
      setTrackModalOpen(false)
      onCompleted?.()
      onClose?.()
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not record the recommendation.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Modal
        title={<span style={{ color: MAROON, fontWeight: 800 }}>{project ? `Project: ${project.name}` : 'Project'}</span>}
        open={open}
        onCancel={onClose}
        destroyOnHidden
        width={960}
        centered
        styles={{ body: { maxHeight: '78vh', overflowY: 'auto', paddingRight: 4 } }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button type="primary" style={PRIMARY_BTN} onClick={() => setTrackModalOpen(true)}>
              Recommend
            </Button>
            <Button onClick={onClose}>Close</Button>
          </div>
        }
      >
        {project && (
          <Spin spinning={loading}>
            <Collapse
              className="mb-4"
              items={[
                {
                  key: 'details',
                  label: 'Project details',
                  children: (
                    <Descriptions column={1} size="small" bordered>
                      <Descriptions.Item label="Name">{project.name}</Descriptions.Item>
                      <Descriptions.Item label="Category">{project.category || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Type">{project.project_type || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Planner">{project.planner?.name || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Track">
                        {project.workflow?.review_track || project.review_track || '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Status">{project.status || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Planned Start">{formatDate(project.planned_start_date)}</Descriptions.Item>
                      <Descriptions.Item label="Planned End">{formatDate(project.planned_end_date)}</Descriptions.Item>
                    </Descriptions>
                  ),
                },
              ]}
            />

            <div className="mb-2 text-sm font-semibold">Activities</div>
            <Table
              className="mb-4"
              rowKey="id"
              size="small"
              dataSource={activities}
              pagination={false}
              locale={{ emptyText: 'No activities recorded for this project.' }}
              columns={[
                { title: 'SN', width: 56, align: 'center', render: (_, __, index) => index + 1 },
                { title: 'Activity', dataIndex: 'name' },
                { title: 'Planned Start', dataIndex: 'planned_start_date', render: formatDate },
                { title: 'Planned End', dataIndex: 'planned_end_date', render: formatDate },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  render: (value) => <Tag>{value || '—'}</Tag>,
                },
                {
                  title: 'Action',
                  width: 100,
                  render: (_, record) => (
                    <Button size="small" onClick={() => setActivityTarget(record)}>
                      View
                    </Button>
                  ),
                },
              ]}
            />

            <div className="mb-2 text-sm font-semibold">Documents</div>
            <Table
              rowKey="id"
              size="small"
              dataSource={documents}
              pagination={false}
              locale={{ emptyText: 'No documents attached to this project.' }}
              columns={[
                { title: 'File', dataIndex: 'file_name' },
                { title: 'Type', dataIndex: 'document_type', render: (value) => value || 'Document' },
                {
                  title: 'Action',
                  width: 100,
                  render: (_, doc) => (
                    <Button size="small" icon={<EyeOutlined />} onClick={() => viewDocument(doc)}>
                      View
                    </Button>
                  ),
                },
              ]}
            />
          </Spin>
        )}
      </Modal>

      <Modal
        title="Activity details"
        open={activityTarget !== null}
        onCancel={() => setActivityTarget(null)}
        destroyOnHidden
        centered
        footer={<Button onClick={() => setActivityTarget(null)}>Close</Button>}
      >
        {activityTarget && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Activity">{activityTarget.name}</Descriptions.Item>
            <Descriptions.Item label="Expected Deliverable">
              {activityTarget.expected_deliverable || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Planned Start">{formatDate(activityTarget.planned_start_date)}</Descriptions.Item>
            <Descriptions.Item label="Planned End">{formatDate(activityTarget.planned_end_date)}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag>{activityTarget.status || '—'}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        title="Coordinator recommendation"
        open={trackModalOpen}
        onCancel={() => setTrackModalOpen(false)}
        confirmLoading={saving}
        onOk={submitRecommend}
        okText="OK"
        okButtonProps={{ style: PRIMARY_BTN }}
        destroyOnHidden
        centered
        width={480}
      >
        <div className="mb-2 text-sm font-medium">Review track</div>
        <Select
          className="w-full"
          value={track}
          onChange={setTrack}
          options={[
            { value: 'SDMM', label: 'SDMM' },
            { value: 'IDMM', label: 'IDMM' },
          ]}
        />
      </Modal>
    </>
  )
}
