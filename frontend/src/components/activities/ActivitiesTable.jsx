import { useState } from 'react'
import { Table, Tooltip, ConfigProvider } from 'antd'
import { Info } from 'lucide-react'
import dayjs from 'dayjs'
import { STATUS, deriveStatus } from '../../lib/status'
import { getPersonName, getPersonRole } from '../../data/people'
import StatusBadge from '../common/StatusBadge'
import ActivityActions from './ActivityActions'
import PreventMutation from '../common/PreventMutation'

function personLookup(people, id) {
  return people?.find((person) => person.id === id)
}

function formatDate(value) {
  return value ? dayjs(value).format('MMM D, YYYY') : '—'
}

function compareDates(a, b) {
  return (a ?? '').localeCompare(b ?? '')
}

const STATUS_FILTER_KEYS = ['not_started', 'ongoing', 'completed']

function getPhaseRowSpan(list, index) {
  const phase = list[index].phase
  if (index > 0 && list[index - 1].phase === phase) return 0
  let span = 1
  while (index + span < list.length && list[index + span].phase === phase) span++
  return span
}

function ActivitiesTable({
  activities,
  visibleActivities,
  filteredInfo,
  onTableChange,
  onEdit,
  onUpdateProgress,
  onDelete,
  people = [],
}) {
  const [selectedRowId, setSelectedRowId] = useState(null)

  const columns = [
    {
      title: 'Phase',
      dataIndex: 'phase',
      key: 'phase',
      width: 200,
      filters: [...new Set(activities.map((a) => a.phase))].map((phase) => ({
        text: phase,
        value: phase,
      })),
      filteredValue: filteredInfo.phase ?? null,
      onCell: (_record, index) => ({ rowSpan: getPhaseRowSpan(visibleActivities, index) }),
    },
    {
      title: 'Activity',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 220,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name, record) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ fontWeight: 600, color: '#202020', lineHeight: 1.45 }}>{name}</span>
          {record.validation_rule && (
            <Tooltip title={record.validation_rule}>
              <Info size={16} style={{ color: '#98A2B3', flexShrink: 0, marginTop: 3 }} />
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Expected deliverable',
      dataIndex: 'expected_deliverable',
      key: 'expected_deliverable',
      width: 220,
    },
    {
      title: 'Planned start',
      dataIndex: 'planned_start_date',
      key: 'planned_start_date',
      sorter: (a, b) => compareDates(a.planned_start_date, b.planned_start_date),
      render: formatDate,
    },
    {
      title: 'Planned end',
      dataIndex: 'planned_end_date',
      key: 'planned_end_date',
      sorter: (a, b) => compareDates(a.planned_end_date, b.planned_end_date),
      render: formatDate,
    },
    {
      title: 'Actual start',
      dataIndex: 'actual_start_date',
      key: 'actual_start_date',
      sorter: (a, b) => compareDates(a.actual_start_date, b.actual_start_date),
      render: formatDate,
    },
    {
      title: 'Actual end',
      dataIndex: 'actual_end_date',
      key: 'actual_end_date',
      sorter: (a, b) => compareDates(a.actual_end_date, b.actual_end_date),
      render: formatDate,
    },
    {
      title: 'Responsible',
      dataIndex: 'responsible_person_id',
      key: 'responsible_person_id',
      width: 170,
      filters: people.map((person) => ({
        text: person.name,
        value: person.id,
      })),
      filteredValue: filteredInfo.responsible_person_id ?? null,
      render: (id) => personLookup(people, id)?.name ?? getPersonName(id),
    },
    {
      title: 'Assigned role',
      dataIndex: 'responsible_person_id',
      key: 'assigned_role',
      width: 150,
      render: (id) => personLookup(people, id)?.role ?? getPersonRole(id),
    },
    {
      title: 'Status',
      key: 'status',
      width: 140,
      filters: STATUS_FILTER_KEYS.map((key) => ({ text: STATUS[key].label, value: key })),
      filteredValue: filteredInfo.status ?? null,
      render: (_, record) => <StatusBadge status={deriveStatus(record)} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 110,
      render: (_, record) => (
        <PreventMutation fallback={<span style={{ color: '#98A2B3', fontSize: 13 }}>—</span>}>
          <ActivityActions
            onEdit={() => onEdit(record)}
            onUpdateProgress={() => onUpdateProgress(record)}
            onDelete={() => onDelete(record.id)}
          />
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
          scroll={{ x: 1700 }}
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