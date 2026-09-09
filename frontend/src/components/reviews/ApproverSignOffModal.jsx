import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Descriptions, Input, Modal, Spin, Table, Tag, message } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import api from '../../lib/axios'
import { fetchAuthorizedFileUrl, unwrapList } from '../../lib/apiHelpers'
import { formatDate } from '../../lib/dates'

const MAROON = '#800000'
const PRIMARY_BTN = { backgroundColor: MAROON, borderColor: MAROON }

/**
 * Approver's DICT "Sign off execution" flow — the same project-context
 * treatment as CoordinatorRecommendationModal (details + activities, each
 * with its own documents on demand), but with no track choice: DICT is
 * already fixed by the project's category, so the only decision here is
 * approve or not — one button, an optional comment, nothing else.
 */
export default function ApproverSignOffModal({ open, project, onClose, onCompleted }) {
  const [loading, setLoading] = useState(false)
  const [activities, setActivities] = useState([])
  const [activityTarget, setActivityTarget] = useState(null)
  const [workflow, setWorkflow] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    if (!project?.id) {
      setActivities([])
      setWorkflow(null)
      return
    }
    setLoading(true)
    try {
      const [activitiesRes, projectRes] = await Promise.all([
        api.get(`/projects/${project.id}/activities`),
        api.get(`/projects/${project.id}`),
      ])
      setActivities(unwrapList(activitiesRes.data))
      setWorkflow(projectRes.data?.workflow ?? null)
    } catch {
      setActivities([])
      setWorkflow(null)
    } finally {
      setLoading(false)
    }
  }, [project])

  useEffect(() => {
    if (!open) return
    loadData()
    setActivityTarget(null)
    setConfirmOpen(false)
    setComment('')
  }, [open, project, loadData])

  const viewDocument = async (doc) => {
    try {
      const url = await fetchAuthorizedFileUrl(doc.id)
      window.open(url, '_blank', 'noopener')
    } catch {
      message.error('Could not open document.')
    }
  }

  const submitSignOff = async () => {
    if (!project?.id) return
    setSaving(true)
    try {
      await api.post(`/projects/${project.id}/approve-execution`, { comment: comment.trim() || undefined })
      message.success('DICT execution sign-off recorded')
      setConfirmOpen(false)
      onCompleted?.()
      onClose?.()
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not record the sign-off.')
    } finally {
      setSaving(false)
    }
  }

  const activityDocs = (activityTarget?.documents || []).filter((doc) => doc.is_current !== false)
  const blockers = workflow?.execution_blockers || []
  const canSignOff = Boolean(workflow?.can_sign_off_execution)

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
            <Button type="primary" style={PRIMARY_BTN} disabled={!canSignOff} onClick={() => setConfirmOpen(true)}>
              Sign off execution
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
              <Descriptions.Item label="Reviewer">{project.reviewer?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Planned dates">
                {formatDate(project.planned_start_date)} — {formatDate(project.planned_end_date)}
              </Descriptions.Item>
              <Descriptions.Item label="Status" span={2}>
                <Tag>{project.status || '—'}</Tag>
              </Descriptions.Item>
            </Descriptions>

            {blockers.length > 0 && (
              <Alert
                className="mt-4"
                type="warning"
                showIcon
                message="Execution gates"
                description={
                  <ul className="mb-0 list-disc pl-5">
                    {blockers.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                }
              />
            )}

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
        title="DICT execution sign-off"
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        destroyOnHidden
        centered
        zIndex={1100}
        width={480}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button type="primary" style={PRIMARY_BTN} loading={saving} onClick={submitSignOff}>
              Sign off
            </Button>
            <Button onClick={() => setConfirmOpen(false)}>Close</Button>
          </div>
        }
      >
        <div className="mb-2 text-sm font-medium">Comment (optional)</div>
        <Input.TextArea rows={3} value={comment} onChange={(event) => setComment(event.target.value)} />
      </Modal>
    </>
  )
}
