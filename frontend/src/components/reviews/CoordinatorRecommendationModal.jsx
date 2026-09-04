import { useCallback, useEffect, useState } from 'react'
import { Button, Descriptions, Modal, Select, Spin, Table, Tag, message } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import api from '../../lib/axios'
import { fetchAuthorizedFileUrl, unwrapList } from '../../lib/apiHelpers'
import { formatDate } from '../../lib/dates'

const MAROON = '#800000'
const PRIMARY_BTN = { backgroundColor: MAROON, borderColor: MAROON }

/**
 * Coordinator's "Recommend execution" flow: project details, a compact
 * activity list (full details + the planner's own documents live behind a
 * per-activity View popup), and a Recommend action that opens a small
 * track-selection popup (SDMM / IDMM) before submitting.
 */
export default function CoordinatorRecommendationModal({ open, project, onClose, onCompleted }) {
  const [loading, setLoading] = useState(false)
  const [activities, setActivities] = useState([])
  const [activityTarget, setActivityTarget] = useState(null)
  const [trackModalOpen, setTrackModalOpen] = useState(false)
  const [track, setTrack] = useState('SDMM')
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    if (!project?.id) {
      setActivities([])
      return
    }
    setLoading(true)
    try {
      const response = await api.get(`/projects/${project.id}/activities`)
      setActivities(unwrapList(response.data))
    } catch {
      setActivities([])
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
      setTrackModalOpen(false)
      onCompleted?.()
      onClose?.()
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not record the recommendation.')
    } finally {
      setSaving(false)
    }
  }

  const activityDocs = (activityTarget?.documents || []).filter((doc) => doc.is_current !== false)

  return (
    <>
      <Modal
        title={<span style={{ color: MAROON, fontWeight: 800 }}>{project ? `Project: ${project.name}` : 'Project'}</span>}
        open={open}
        onCancel={onClose}
        destroyOnHidden
        width={860}
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
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Name">{project.name}</Descriptions.Item>
              <Descriptions.Item label="Category">{project.category || '—'}</Descriptions.Item>
              <Descriptions.Item label="Type">{project.project_type || '—'}</Descriptions.Item>
              <Descriptions.Item label="Planner">{project.planner?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Status" span={2}>
                <Tag>{project.status || '—'}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <div className="mb-2 mt-4 text-sm font-bold" style={{ color: MAROON }}>
              Activities
            </div>
            <Table
              rowKey="id"
              size="small"
              dataSource={activities}
              pagination={false}
              locale={{ emptyText: 'No activities recorded for this project.' }}
              columns={[
                { title: 'SN', width: 56, align: 'center', render: (_, __, index) => index + 1 },
                { title: 'Activity', dataIndex: 'name' },
                {
                  title: 'Action',
                  width: 100,
                  align: 'center',
                  render: (_, record) => (
                    <Button size="small" icon={<EyeOutlined />} onClick={() => setActivityTarget(record)}>
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
        title={activityTarget ? `Activity — ${activityTarget.name}` : 'Activity'}
        open={activityTarget !== null}
        onCancel={() => setActivityTarget(null)}
        destroyOnHidden
        centered
        zIndex={1100}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setActivityTarget(null)}>Close</Button>
          </div>
        }
      >
        {activityTarget && (
          <div>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Activity">{activityTarget.name}</Descriptions.Item>
              <Descriptions.Item label="Expected Deliverable">
                {activityTarget.expected_deliverable || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Planned Start">{formatDate(activityTarget.planned_start_date)}</Descriptions.Item>
              <Descriptions.Item label="Planned End">{formatDate(activityTarget.planned_end_date)}</Descriptions.Item>
              <Descriptions.Item label="Responsible Person">
                {activityTarget.responsible_person?.name || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag>{activityTarget.status || '—'}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <div className="mb-1 mt-4 text-sm font-semibold">Documents</div>
            {activityDocs.length > 0 ? (
              <div className="flex flex-col gap-1">
                {activityDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {doc.file_name}{' '}
                      <span className="text-gray-400">({doc.document_type || 'Document'})</span>
                    </span>
                    <Button size="small" type="link" onClick={() => viewDocument(doc)}>
                      View
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No documents attached to this activity.</div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="Coordinator recommendation"
        open={trackModalOpen}
        onCancel={() => setTrackModalOpen(false)}
        destroyOnHidden
        centered
        zIndex={1100}
        width={480}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button type="primary" style={PRIMARY_BTN} loading={saving} onClick={submitRecommend}>
              Recommend
            </Button>
            <Button onClick={() => setTrackModalOpen(false)}>Close</Button>
          </div>
        }
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
