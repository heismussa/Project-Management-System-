import { Button, Descriptions, Input, Modal, Spin, Table } from 'antd'
import { formatDate } from '../../lib/dates'

/**
 * Reviewer's "Review activity" popup on the Projects page — a plan
 * submission, a progress update, or a post-approval plan change, all
 * routed through the same Approve/Reject footer. Purely presentational:
 * ProjectsPage.jsx owns activityReviewTarget and the submit/close logic
 * since those also drive ProjectWorkspaceTabs' onActivityReview prop.
 */
function ActivityReviewModal({
  target,
  docs,
  docsLoading,
  comment,
  onCommentChange,
  rejecting,
  rejectReason,
  onRejectReasonChange,
  saving,
  pendingMessage,
  onApprove,
  onReject,
  onBack,
  onCancel,
  onViewDocument,
}) {
  return (
    <Modal
      title={<span style={{ color: '#800000', fontWeight: 700 }}>Review activity</span>}
      open={Boolean(target)}
      onCancel={onCancel}
      destroyOnHidden
      centered
      width={760}
      zIndex={1100}
      maskClosable={false}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {rejecting ? (
            <>
              <Button danger loading={saving} onClick={onReject}>
                Confirm reject
              </Button>
              <Button onClick={onBack}>Back</Button>
            </>
          ) : (
            <>
              <Button
                type="primary"
                style={{ backgroundColor: '#800000', borderColor: '#800000' }}
                loading={saving}
                onClick={onApprove}
              >
                Approve
              </Button>
              <Button danger loading={saving} onClick={onReject}>
                Reject
              </Button>
              <Button onClick={onCancel}>Cancel</Button>
            </>
          )}
        </div>
      }
    >
      {target && (
        <div>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Activity">{target.name}</Descriptions.Item>
            <Descriptions.Item label="Expected Deliverable">
              {target.expected_deliverable || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Planned Start">
              {formatDate(target.planned_start_date)}
            </Descriptions.Item>
            <Descriptions.Item label="Planned End">
              {formatDate(target.planned_end_date)}
            </Descriptions.Item>
            <Descriptions.Item label="Responsible Person">
              {target.responsible_person?.name || '—'}
            </Descriptions.Item>
            {target.progress_review_status === 'pending' && (
              <>
                <Descriptions.Item label="Actual Start">
                  {formatDate(target.actual_start_date)}
                </Descriptions.Item>
                <Descriptions.Item label="Actual End">
                  {formatDate(target.actual_end_date)}
                </Descriptions.Item>
              </>
            )}
            <Descriptions.Item label="What's pending">{pendingMessage}</Descriptions.Item>
          </Descriptions>

          <div className="mt-4">
            <div className="mb-1 text-sm font-semibold">Documents</div>
            <Spin spinning={docsLoading}>
              <Table
                rowKey="id"
                size="small"
                dataSource={docs}
                pagination={false}
                locale={{ emptyText: 'No documents attached to this activity.' }}
                columns={[
                  { title: 'File', dataIndex: 'file_name' },
                  { title: 'Document Type', dataIndex: 'document_type', render: (value) => value || 'Document' },
                  {
                    title: 'Action',
                    width: 100,
                    render: (_, doc) => (
                      <Button size="small" onClick={() => onViewDocument(doc)}>
                        View
                      </Button>
                    ),
                  },
                ]}
              />
            </Spin>
          </div>

          {rejecting ? (
            <div className="mt-4">
              <div className="mb-1 text-sm font-semibold text-red-600">Reason for rejection (required)</div>
              <Input.TextArea
                rows={3}
                autoFocus
                placeholder="Explain what needs to change before this can be approved"
                value={rejectReason}
                onChange={(event) => onRejectReasonChange(event.target.value)}
              />
            </div>
          ) : (
            <div className="mt-4">
              <div className="mb-1 text-sm font-semibold">Comment (optional)</div>
              <Input.TextArea
                rows={3}
                placeholder="Any remarks about this activity"
                value={comment}
                onChange={(event) => onCommentChange(event.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

export default ActivityReviewModal
