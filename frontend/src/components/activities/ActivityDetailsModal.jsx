import { Alert, Button, Input, Modal, Popconfirm, Space, Spin, Table, Typography } from 'antd'
import dayjs from 'dayjs'
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons'
import { formatDate } from '../../lib/dates'
import { getPersonName } from '../../data/people'
import StatusBadge from '../common/StatusBadge'
import { deriveStatus } from '../../lib/status'

const { Text } = Typography
const MAROON = '#800000'

function personLookup(people, id) {
  return people?.find((person) => person.id === id)
}

/** Read-only "View" popup for a planned activity: details (always visible,
 * not collapsible), a plan-change review section when one is pending, its
 * documents, and an Update action. */
function ActivityDetailsModal({
  open,
  activity,
  people = [],
  documents = [],
  documentsLoading = false,
  onClose,
  onUpdate,
  onViewDocument,
  onDownloadDocument,
  canReviewChange = false,
  changeComment = '',
  onChangeCommentChange,
  onApproveChange,
  onRejectChange,
  changeSaving = false,
  canMarkComplete = false,
  onMarkComplete,
}) {
  if (!activity) return null

  const responsibleName = personLookup(people, activity.responsible_person_id)?.name ?? getPersonName(activity.responsible_person_id)
  // canReviewChange already folds in both the role check and whether this
  // activity is actually awaiting approval (either a post-approval plan
  // change, or the plan's very first, not-yet-reviewed submission).
  const showChangeReview = canReviewChange

  return (
    <Modal
      title={<span style={{ color: MAROON, fontWeight: 700 }}>Activity details</span>}
      open={open}
      onCancel={onClose}
      destroyOnHidden
      width={720}
      centered
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {showChangeReview && (
            <>
              <Button
                type="primary"
                style={{ backgroundColor: MAROON, borderColor: MAROON }}
                loading={changeSaving}
                onClick={onApproveChange}
              >
                Approve change
              </Button>
              <Button danger loading={changeSaving} onClick={onRejectChange}>
                Reject change
              </Button>
            </>
          )}
          {canMarkComplete && (
            <Popconfirm
              title="Mark this activity complete?"
              description={`This records today's date (${dayjs().format('MMM D, YYYY')}) as the actual end and cannot be undone.`}
              okText="Mark complete"
              onConfirm={onMarkComplete}
            >
              <Button type="primary" style={{ backgroundColor: MAROON, borderColor: MAROON }}>
                Mark complete
              </Button>
            </Popconfirm>
          )}
          {onUpdate &&
            !activity.actual_end_date &&
            (canMarkComplete ? (
              <Button onClick={onUpdate}>Update</Button>
            ) : (
              <Button type="primary" style={{ backgroundColor: MAROON, borderColor: MAROON }} onClick={onUpdate}>
                Update
              </Button>
            ))}
          <Button onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="rounded border border-gray-200">
        <div className="border-b border-gray-200 px-3 py-2 text-sm font-semibold" style={{ color: MAROON }}>
          Details
        </div>
        <div className="flex flex-col gap-2 p-3 text-sm">
          <div className="flex justify-between gap-3">
            <Text type="secondary">Activity name</Text>
            <Text strong>{activity.name}</Text>
          </div>
          <div className="flex justify-between gap-3">
            <Text type="secondary">Expected deliverable</Text>
            <Text>{activity.expected_deliverable || '—'}</Text>
          </div>
          <div className="flex justify-between gap-3">
            <Text type="secondary">Planned start</Text>
            <Text>{formatDate(activity.planned_start_date)}</Text>
          </div>
          <div className="flex justify-between gap-3">
            <Text type="secondary">Planned end</Text>
            <Text>{formatDate(activity.planned_end_date)}</Text>
          </div>
          <div className="flex justify-between gap-3">
            <Text type="secondary">Actual start</Text>
            <Text>{formatDate(activity.actual_start_date)}</Text>
          </div>
          <div className="flex justify-between gap-3">
            <Text type="secondary">Actual end</Text>
            <Text>{formatDate(activity.actual_end_date)}</Text>
          </div>
          <div className="flex justify-between gap-3">
            <Text type="secondary">Responsible person</Text>
            <Text>{responsibleName}</Text>
          </div>
          <div className="flex justify-between gap-3">
            <Text type="secondary">Status</Text>
            <StatusBadge status={deriveStatus(activity)} />
          </div>
        </div>
      </div>

      {activity.plan_change_status === 'rejected' && !showChangeReview && (
        <Alert
          className="mt-3"
          type="error"
          showIcon
          message="Reason for rejection"
          description={activity.plan_change_comment || 'No reason was given.'}
        />
      )}

      <div className="mt-4">
        <div className="mb-2 text-sm font-semibold">Documents</div>
        <Spin spinning={documentsLoading}>
          <Table
            rowKey="id"
            size="small"
            dataSource={documents}
            pagination={false}
            locale={{ emptyText: 'No documents attached to this activity.' }}
            columns={[
              { title: 'File', dataIndex: 'file_name' },
              { title: 'Document type', dataIndex: 'document_type', render: (value) => value || 'Document' },
              {
                title: 'Action',
                width: 160,
                render: (_, doc) => (
                  <Space size="small">
                    <Button size="small" icon={<EyeOutlined />} onClick={() => onViewDocument?.(doc)}>
                      View
                    </Button>
                    <Button size="small" icon={<DownloadOutlined />} onClick={() => onDownloadDocument?.(doc)} />
                  </Space>
                ),
              },
            ]}
          />
        </Spin>
      </div>

      {showChangeReview && (
        <div className="mt-4">
          <div className="mb-2 text-sm font-semibold">Comment</div>
          <Input.TextArea
            rows={2}
            value={changeComment}
            onChange={(event) => onChangeCommentChange?.(event.target.value)}
            placeholder="Comment for the planner (required if rejecting)"
          />
        </div>
      )}
    </Modal>
  )
}

export default ActivityDetailsModal
