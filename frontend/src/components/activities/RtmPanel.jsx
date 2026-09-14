import { useCallback, useEffect, useState } from 'react'
import { message, Modal, Space, Spin, Alert, Button, Table, Tag, Descriptions, Input, Popconfirm } from 'antd'
import { PlusOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { formatDate } from '../../lib/dates'
import AddRtmModal from './AddRtmModal'
import RequirementProgressModal from '../matrix/RequirementProgressModal'
import TestScoreModal from '../matrix/TestScoreModal'
import api from '../../lib/axios'
import { apiTestResultToUi, uiTestResultToApi, unwrapItem, unwrapList } from '../../lib/apiHelpers'
import { ROLES } from '../../utility/Config.jsx'

/**
 * RTM (requirements traceability matrix) section of the Implementation
 * Plan page — the requirements table, its "Add requirement" flow, and every
 * modal for viewing/editing/reviewing a single requirement's progress.
 * Split out of ImplementationPlanPage.jsx since this whole state group
 * (requirements + five modals) is only ever exercised together and has no
 * dependency on the activities table above it beyond the project/role
 * context passed in as props.
 */
function RtmPanel({
  enabled,
  projectId,
  executionUnderway,
  roleName,
  canAddActivity,
  plannedStartDate,
  plannedEndDate,
  onProjectChanged,
  onViewDocument,
  onDownloadDocument,
}) {
  const [rtmModalOpen, setRtmModalOpen] = useState(false)
  const [requirements, setRequirements] = useState([])
  const [requirementsLoading, setRequirementsLoading] = useState(false)
  const [rtmViewTarget, setRtmViewTarget] = useState(null)
  const [rtmViewDocs, setRtmViewDocs] = useState([])
  const [rtmViewDocsLoading, setRtmViewDocsLoading] = useState(false)
  const [rtmSaving, setRtmSaving] = useState(false)
  const [rtmProgressTarget, setRtmProgressTarget] = useState(null)
  const [rtmTestTarget, setRtmTestTarget] = useState(null)
  const [rtmRejecting, setRtmRejecting] = useState(false)
  const [rtmRejectComment, setRtmRejectComment] = useState('')
  const [rtmEditTarget, setRtmEditTarget] = useState(null)
  const [rtmEditCode, setRtmEditCode] = useState('')
  const [rtmEditDescription, setRtmEditDescription] = useState('')
  const [rtmEditSaving, setRtmEditSaving] = useState(false)

  const loadRequirements = useCallback(async (id) => {
    if (!id) {
      setRequirements([])
      return
    }
    setRequirementsLoading(true)
    try {
      const response = await api.get(`/projects/${id}/requirements`)
      setRequirements(unwrapList(response.data))
    } catch {
      setRequirements([])
    } finally {
      setRequirementsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (enabled) loadRequirements(projectId)
  }, [projectId, enabled, loadRequirements])

  // Execution has actually started once either a Coordinator recommends
  // (SDMM/IDMM) or an Approver signs off directly (DICT, which skips
  // recommendation entirely) — recommended_at alone is never set on the
  // DICT path, so gating on it left the requirements matrix permanently
  // locked for that track even after sign-off.
  const canAddRtm = executionUnderway && canAddActivity
  const canReviewRtm = executionUnderway && (roleName === ROLES.PRV || roleName === ROLES.PAD)
  // Start / Record test result / Mark complete are the Planner's own
  // reporting of what actually happened — the Reviewer's role here is
  // Approve/Reject only, not doing the work.
  const canUpdateRtmProgress = executionUnderway && canAddActivity

  const openRtmView = (requirement) => {
    setRtmViewTarget(requirement)
    setRtmViewDocs([])
    setRtmViewDocsLoading(true)
    api
      .get(`/projects/${projectId}/documents`, { params: { requirement_id: requirement.id } })
      .then((response) => setRtmViewDocs(unwrapList(response.data)))
      .catch(() => setRtmViewDocs([]))
      .finally(() => setRtmViewDocsLoading(false))
  }

  const reviewRequirement = async (id, review_decision, comment) => {
    setRtmSaving(true)
    try {
      await api.patch(`/requirements/${id}/review`, { review_decision, comment })
      message.success(review_decision === 'approved' ? 'Requirement approved' : 'Requirement rejected')
      setRtmViewTarget(null)
      setRtmRejecting(false)
      setRtmRejectComment('')
      await loadRequirements(projectId)
      onProjectChanged?.()
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not save review decision.')
    } finally {
      setRtmSaving(false)
    }
  }

  const confirmRejectRequirement = () => {
    if (!rtmRejectComment.trim()) {
      message.error('Add a reason for the rejection')
      return
    }
    reviewRequirement(rtmViewTarget.id, 'rejected', rtmRejectComment.trim())
  }

  const openRtmEdit = (requirement) => {
    setRtmEditTarget(requirement)
    setRtmEditCode(requirement.requirement_code || '')
    setRtmEditDescription(requirement.description || '')
    setRtmViewTarget(null)
  }

  const submitRtmEdit = async () => {
    if (!rtmEditCode.trim() || !rtmEditDescription.trim()) {
      message.error('Code and description are both required')
      return
    }
    setRtmEditSaving(true)
    try {
      await api.put(`/requirements/${rtmEditTarget.id}`, {
        requirement_code: rtmEditCode.trim(),
        description: rtmEditDescription.trim(),
      })
      message.success('Requirement updated and resubmitted for review')
      setRtmEditTarget(null)
      await loadRequirements(projectId)
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not update the requirement.')
    } finally {
      setRtmEditSaving(false)
    }
  }

  const startRequirement = async ({ actual_start_date, remark }) => {
    try {
      const response = await api.patch(`/requirements/${rtmProgressTarget.id}/status`, {
        actual_start_date,
        remarks: remark,
      })
      message.success('Requirement started')
      setRtmProgressTarget(null)
      await loadRequirements(projectId)
      openRtmView(unwrapItem(response.data))
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not save.')
    }
  }

  const markRequirementComplete = async (requirement) => {
    try {
      await api.patch(`/requirements/${requirement.id}/status`, {
        actual_end_date: dayjs().format('YYYY-MM-DD'),
        remarks: 'Requirement marked complete.',
      })
      message.success('Requirement marked complete')
      setRtmViewTarget(null)
      await loadRequirements(projectId)
      onProjectChanged?.()
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not mark complete.')
    }
  }

  const saveRequirementTestResult = async ({ test_result, test_comments }) => {
    try {
      const response = await api.patch(`/requirements/${rtmTestTarget.id}/status`, {
        implementation_status: rtmTestTarget.implementation_status || 'Pending',
        test_result: uiTestResultToApi(test_result),
        remarks: test_comments,
      })
      message.success('Test result saved')
      setRtmTestTarget(null)
      await loadRequirements(projectId)
      openRtmView(unwrapItem(response.data))
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not save test result.')
    }
  }

  const showSection = enabled && (canAddRtm || requirements.length > 0)

  return (
    <>
      {showSection && (
        <div className="mt-2">
          <div className="mb-2" style={{ color: '#800000', fontWeight: 800 }}>
            RTM Requirements
          </div>

          {requirementsLoading ? (
            <Spin size="small" />
          ) : (
            requirements.length > 0 && (
              <Table
                className="mb-3"
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={requirements}
                locale={{ emptyText: 'No requirements added yet.' }}
                columns={[
                  { title: 'SN', width: 56, align: 'center', render: (_, __, index) => index + 1 },
                  {
                    title: 'Code',
                    dataIndex: 'requirement_code',
                    width: 100,
                    ellipsis: true,
                    onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
                  },
                  {
                    title: 'Status',
                    dataIndex: 'implementation_status',
                    width: 130,
                    onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
                    render: (value) => <Tag style={{ fontSize: 14, padding: '2px 10px' }}>{value || 'Pending'}</Tag>,
                  },
                  {
                    title: 'Score',
                    dataIndex: 'score_percent',
                    width: 90,
                    align: 'center',
                    onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
                    render: (value) => `${value ?? 0}%`,
                  },
                  {
                    title: 'Review Decision',
                    dataIndex: 'review_decision',
                    width: 140,
                    onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
                    render: (value) =>
                      value ? (
                        <Tag
                          color={value === 'approved' ? 'green' : value === 'rejected' ? 'red' : 'gold'}
                          style={{ fontSize: 14, padding: '2px 10px' }}
                        >
                          {value.replace('_', ' ')}
                        </Tag>
                      ) : (
                        <Tag style={{ fontSize: 14, padding: '2px 10px' }}>Not reviewed</Tag>
                      ),
                  },
                  {
                    title: 'Action',
                    width: 90,
                    onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
                    render: (_, record) => (
                      <Button
                        type="primary"
                        icon={<EyeOutlined />}
                        style={{ backgroundColor: '#800000', borderColor: '#800000' }}
                        onClick={() => openRtmView(record)}
                      >
                        View
                      </Button>
                    ),
                  },
                ]}
              />
            )
          )}

          {canAddRtm && (
            <div className="flex justify-end">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                style={{ backgroundColor: '#7A0C22', borderColor: '#7A0C22' }}
                onClick={() => setRtmModalOpen(true)}
              >
                Add requirement
              </Button>
            </div>
          )}
        </div>
      )}

      <AddRtmModal
        open={rtmModalOpen}
        projectId={projectId}
        onClose={() => setRtmModalOpen(false)}
        onAdded={() => {
          loadRequirements(projectId)
          onProjectChanged?.()
        }}
      />

      <Modal
        title={<span style={{ color: '#800000', fontWeight: 700 }}>Requirement details</span>}
        open={rtmViewTarget !== null}
        onCancel={() => {
          setRtmViewTarget(null)
          setRtmRejecting(false)
          setRtmRejectComment('')
        }}
        destroyOnHidden
        width={760}
        footer={
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }}>
            {rtmRejecting ? (
              <>
                <Button danger loading={rtmSaving} onClick={confirmRejectRequirement}>
                  Confirm reject
                </Button>
                <Button
                  onClick={() => {
                    setRtmRejecting(false)
                    setRtmRejectComment('')
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                {canReviewRtm && !rtmViewTarget?.review_decision && (
                  <>
                    <Button
                      type="primary"
                      style={{ backgroundColor: '#7A0C22', borderColor: '#7A0C22' }}
                      loading={rtmSaving}
                      onClick={() => rtmViewTarget && reviewRequirement(rtmViewTarget.id, 'approved')}
                    >
                      Approve
                    </Button>
                    <Button danger onClick={() => setRtmRejecting(true)}>
                      Reject
                    </Button>
                  </>
                )}
                {canAddRtm && rtmViewTarget?.review_decision === 'rejected' && (
                  <Button
                    type="primary"
                    style={{ backgroundColor: '#7A0C22', borderColor: '#7A0C22' }}
                    onClick={() => openRtmEdit(rtmViewTarget)}
                  >
                    Edit & resubmit
                  </Button>
                )}
                {canUpdateRtmProgress &&
                  rtmViewTarget?.review_decision === 'approved' &&
                  !rtmViewTarget?.actual_start_date && (
                    <Button
                      onClick={() => {
                        setRtmProgressTarget(rtmViewTarget)
                        setRtmViewTarget(null)
                      }}
                    >
                      Start
                    </Button>
                  )}
                {canUpdateRtmProgress &&
                  rtmViewTarget?.review_decision === 'approved' &&
                  rtmViewTarget?.actual_start_date &&
                  !rtmViewTarget?.test_result && (
                    <Button
                      onClick={() => {
                        setRtmTestTarget(rtmViewTarget)
                        setRtmViewTarget(null)
                      }}
                    >
                      Record test result
                    </Button>
                  )}
                {canUpdateRtmProgress &&
                  rtmViewTarget?.review_decision === 'approved' &&
                  rtmViewTarget?.test_result &&
                  !rtmViewTarget?.actual_end_date && (
                    <Popconfirm
                      title="Mark this requirement complete?"
                      description={`This records today's date (${dayjs().format('MMM D, YYYY')}) as the actual end and cannot be undone.`}
                      okText="Mark complete"
                      onConfirm={() => markRequirementComplete(rtmViewTarget)}
                    >
                      <Button>Mark complete</Button>
                    </Popconfirm>
                  )}
                <Button
                  onClick={() => {
                    setRtmViewTarget(null)
                    setRtmRejecting(false)
                    setRtmRejectComment('')
                  }}
                >
                  Close
                </Button>
              </>
            )}
          </div>
        }
      >
        {rtmViewTarget && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Code">{rtmViewTarget.requirement_code}</Descriptions.Item>
              <Descriptions.Item label="Description">{rtmViewTarget.description}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag>{rtmViewTarget.implementation_status || 'Pending'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Actual start">{formatDate(rtmViewTarget.actual_start_date)}</Descriptions.Item>
              <Descriptions.Item label="Actual end">{formatDate(rtmViewTarget.actual_end_date)}</Descriptions.Item>
              <Descriptions.Item label="Review decision">
                {rtmViewTarget.review_decision ? (
                  <Tag
                    color={
                      rtmViewTarget.review_decision === 'approved'
                        ? 'green'
                        : rtmViewTarget.review_decision === 'rejected'
                          ? 'red'
                          : 'gold'
                    }
                  >
                    {rtmViewTarget.review_decision.replace('_', ' ')}
                  </Tag>
                ) : (
                  <Tag>Not reviewed</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Remarks">{rtmViewTarget.remarks || '—'}</Descriptions.Item>
            </Descriptions>

            {rtmViewTarget.review_decision === 'rejected' && !rtmRejecting && (
              <Alert
                className="mt-3"
                type="error"
                showIcon
                message="Reason for rejection"
                description={rtmViewTarget.review_comment || 'No reason was given.'}
              />
            )}

            {rtmRejecting && (
              <div className="mt-3">
                <div className="mb-1 text-sm font-medium">Reason for rejection</div>
                <Input.TextArea
                  rows={3}
                  autoFocus
                  value={rtmRejectComment}
                  onChange={(event) => setRtmRejectComment(event.target.value)}
                  placeholder="Explain what needs to change so the planner can act on it"
                />
              </div>
            )}

            <div className="mt-4">
              <div className="mb-2 text-sm font-semibold">Documents</div>
              <Spin spinning={rtmViewDocsLoading}>
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={rtmViewDocs}
                  pagination={false}
                  locale={{ emptyText: 'No documents attached to this requirement.' }}
                  columns={[
                    { title: 'File', dataIndex: 'file_name' },
                    { title: 'Document Type', dataIndex: 'document_type', render: (value) => value || 'Document' },
                    {
                      title: 'Action',
                      width: 160,
                      render: (_, doc) => (
                        <Space size="small">
                          <Button size="small" icon={<EyeOutlined />} onClick={() => onViewDocument(doc)}>
                            View
                          </Button>
                          <Button size="small" icon={<DownloadOutlined />} onClick={() => onDownloadDocument(doc)} />
                        </Space>
                      ),
                    },
                  ]}
                />
              </Spin>
            </div>
          </>
        )}
      </Modal>

      <RequirementProgressModal
        open={rtmProgressTarget !== null}
        requirement={rtmProgressTarget}
        plannedStartDate={plannedStartDate}
        plannedEndDate={plannedEndDate}
        onCancel={() => setRtmProgressTarget(null)}
        onSave={startRequirement}
      />

      <TestScoreModal
        open={rtmTestTarget !== null}
        requirement={
          rtmTestTarget ? { ...rtmTestTarget, test_result: apiTestResultToUi(rtmTestTarget.test_result) } : null
        }
        onCancel={() => setRtmTestTarget(null)}
        onSave={saveRequirementTestResult}
      />

      <Modal
        title={<span style={{ color: '#800000', fontWeight: 700 }}>Edit requirement</span>}
        open={rtmEditTarget !== null}
        onCancel={() => setRtmEditTarget(null)}
        destroyOnHidden
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button
              type="primary"
              style={{ backgroundColor: '#7A0C22', borderColor: '#7A0C22' }}
              loading={rtmEditSaving}
              onClick={submitRtmEdit}
            >
              Save and resubmit
            </Button>
            <Button onClick={() => setRtmEditTarget(null)}>Cancel</Button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-gray-600">
          Fixing and saving sends this requirement back to the reviewer as not-yet-reviewed.
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <div className="mb-1 text-sm font-medium">Requirement code</div>
            <Input value={rtmEditCode} onChange={(event) => setRtmEditCode(event.target.value)} placeholder="e.g. REQ-001" />
          </div>
          <div>
            <div className="mb-1 text-sm font-medium">Description</div>
            <Input.TextArea
              rows={3}
              value={rtmEditDescription}
              onChange={(event) => setRtmEditDescription(event.target.value)}
              placeholder="Functional or technical requirement"
            />
          </div>
        </div>
      </Modal>
    </>
  )
}

export default RtmPanel
