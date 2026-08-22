import { useState } from 'react'
import { Table, Tooltip, ConfigProvider, Tag } from 'antd'
import { Info } from 'lucide-react'
import { STATUS, deriveStatus } from '../../lib/status'
import { formatDate } from '../../lib/dates'
import { getPersonName } from '../../data/people'
import StatusBadge from '../common/StatusBadge'
import PreventMutation from '../common/PreventMutation'
import ActivityActions from './ActivityActions'

function personLookup(people, id) {
  return people?.find((person) => person.id === id)
}

function compareDates(a, b) {
  return (a ?? '').localeCompare(b ?? '')
}

// pending isn't reachable from deriveStatus() for activities (dates only
// ever resolve to not_started/ongoing/completed), so it's left out here.
const STATUS_FILTER_KEYS = ['not_started', 'ongoing', 'completed']

function ActivitiesTable({
  activities,
  visibleActivities,
  filteredInfo,
  onTableChange,
  onReview,
  people = [],
}) {
  const [selectedRowId, setSelectedRowId] = useState(null)

  const responsibleFilters = [...new Set(
    activities
      .map((activity) => activity.responsible_person_id)
      .filter((id) => id != null),
  )].map((id) => ({
    text: personLookup(people, id)?.name ?? getPersonName(id),
    value: id,
  }))

  const columns = [
    {
      title: 'Activity Done',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 220,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name, record) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ fontWeight: 600, color: '#202020', lineHeight: 1.45 }}>{name}</span>
          {record.plan_change_status === 'pending' && (
            <Tag color="gold">Pending approval</Tag>
          )}
          {record.validation_rule && (
            <Tooltip title={record.validation_rule}>
              <Info size={16} style={{ color: '#98A2B3', flexShrink: 0, marginTop: 3 }} />
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Planned Start',
      dataIndex: 'planned_start_date',
      key: 'planned_start_date',
      sorter: (a, b) => compareDates(a.planned_start_date, b.planned_start_date),
      render: formatDate,
    },
    {
      title: 'Planned End',
      dataIndex: 'planned_end_date',
      key: 'planned_end_date',
      sorter: (a, b) => compareDates(a.planned_end_date, b.planned_end_date),
      render: formatDate,
    },
    {
      title: 'Actual Start',
      dataIndex: 'actual_start_date',
      key: 'actual_start_date',
      sorter: (a, b) => compareDates(a.actual_start_date, b.actual_start_date),
      render: formatDate,
    },
    {
      title: 'Actual End',
      dataIndex: 'actual_end_date',
      key: 'actual_end_date',
      sorter: (a, b) => compareDates(a.actual_end_date, b.actual_end_date),
      render: formatDate,
    },
    {
      title: 'Expected Deliverable',
      dataIndex: 'expected_deliverable',
      key: 'expected_deliverable',
      width: 220,
    },
    {
      title: 'Responsible Person',
      dataIndex: 'responsible_person_id',
      key: 'responsible_person_id',
      width: 150,
      filters: responsibleFilters,
      filteredValue: filteredInfo.responsible_person_id ?? null,
      onFilter: (value, record) => String(record.responsible_person_id) === String(value),
      render: (id) => personLookup(people, id)?.name ?? getPersonName(id),
    },
    {
      title: 'Activity Status',
      key: 'status',
      width: 140,
      filters: STATUS_FILTER_KEYS.map((key) => ({ text: STATUS[key].label, value: key })),
      filteredValue: filteredInfo.status ?? null,
      render: (_, record) => <StatusBadge status={deriveStatus(record)} />,
    },
    {
      title: 'Activity Action',
      key: 'actions',
      fixed: 'right',
      width: 140,
      align: 'center',
      render: (_, record) => (
        <PreventMutation>
          <ActivityActions onReview={() => onReview(record)} />
        </PreventMutation>
      ),
    },
  ]

  return (
    <div
      className="rounded-xl bg-white"
      style={{ border: '1px solid #ECE8E4', boxShadow: '0 4px 18px rgba(0,0,0,.045)', overflow: 'hidden' }}
    >
      <ConfigProvider
        theme={{
          components: {
            Table: {
              headerBg: '#740019',
              headerColor: '#ffffff',
              headerSplitColor: 'rgba(255,255,255,.22)',
              rowHoverBg: '#FFFDF9',
              cellPaddingInline: 16,
              fontSize: 14,
            },
          },
        }}
      >
        <Table
          className="plan-table"
          rowKey="id"
          columns={columns}
          dataSource={visibleActivities}
          onChange={onTableChange}
          scroll={{ x: 1400 }}
          pagination={false}
          rowClassName={(record) => (record.id === selectedRowId ? 'selected-row' : '')}
          onRow={(record) => ({
            onClick: () => setSelectedRowId((prev) => (prev === record.id ? null : record.id)),
          })}
        />
      </ConfigProvider>
      <div style={{ padding: '14px 20px', borderTop: '1px solid #ECE8E4', fontSize: 13, color: '#667085' }}>
        Showing 1–{visibleActivities.length} of {activities.length} activities
      </div>
    </div>
  )
}

export default ActivitiesTable
