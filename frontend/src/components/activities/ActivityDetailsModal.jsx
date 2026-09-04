import { Button, Modal, Space, Spin, Table, Typography } from 'antd'
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
 * not collapsible), its documents, and an Update action. */
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
}) {
  if (!activity) return null

  const responsibleName = personLookup(people, activity.responsible_person_id)?.name ?? getPersonName(activity.responsible_person_id)

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
          {onUpdate && (
            <Button type="primary" style={{ backgroundColor: MAROON, borderColor: MAROON }} onClick={onUpdate}>
              Update
            </Button>
          )}
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
            <Text type="secondary">Responsible person</Text>
            <Text>{responsibleName}</Text>
          </div>
          <div className="flex justify-between gap-3">
            <Text type="secondary">Status</Text>
            <StatusBadge status={deriveStatus(activity)} />
          </div>
        </div>
      </div>

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
    </Modal>
  )
}

export default ActivityDetailsModal
