import { useMemo, useState } from 'react'
import { Table, Tooltip, ConfigProvider, Tag } from 'antd'
import { Info } from 'lucide-react'
import { STATUS, deriveStatus } from '../../lib/status'
import { formatDate } from '../../lib/dates'
import StatusBadge from '../common/StatusBadge'
import ActivityActions from './ActivityActions'
import { ROLES } from '../../utility/Config.jsx'
import { canShowActivityActionColumn, useActiveRoleName } from '../common/RoleGuard'
import { useAppTheme } from '../../theme/ThemeProvider'
import { PMS_DARK_BG_CONTAINER, PMS_DARK_ROW_HOVER } from '../../theme/AppProviders'

function compareDates(a, b) {
  return (a ?? '').localeCompare(b ?? '')
}

const DATE_COLUMN_WIDTH = 100
const STATUS_COLUMN_WIDTH = 100
const ACTION_COLUMN_WIDTH = 100

const nowrapHeader = () => ({ style: { whiteSpace: 'nowrap' } })

function dateColumn(title, dataIndex) {
  return {
    title,
    dataIndex,
    key: dataIndex,
    width: DATE_COLUMN_WIDTH,
    align: 'center',
    onHeaderCell: nowrapHeader,
    sorter: (a, b) => compareDates(a[dataIndex], b[dataIndex]),
    render: formatDate,
  }
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
  onUploadDocument,
  onSaveDocument,
  onSubmitPlan,
  onUpdateDates,
  pendingDocumentActivityId = null,
  actionsOpenId = null,
  onActionsOpenChange,
}) {
  const roleName = useActiveRoleName()
  const { isDark } = useAppTheme()
  const isPlanner = roleName === ROLES.PPL
  const showActionColumn = canShowActivityActionColumn(roleName)
  const [selectedRowId, setSelectedRowId] = useState(null)

  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: 'Activity Done',
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
        sorter: (a, b) => a.name.localeCompare(b.name),
        onHeaderCell: nowrapHeader,
        render: (name, record) => (
          <Tooltip title={name}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, minWidth: 0 }}>
              <span
                style={{
                  fontWeight: 600,
                  color: '#202020',
                  lineHeight: 1.45,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {name}
              </span>
              {record.plan_change_status === 'pending' && (
                <Tag color="gold" style={{ flexShrink: 0 }}>
                  Pending approval
                </Tag>
              )}
              {record.validation_rule && (
                <Tooltip title={record.validation_rule}>
                  <Info size={16} style={{ color: '#98A2B3', flexShrink: 0, marginTop: 3 }} />
                </Tooltip>
              )}
            </div>
          </Tooltip>
        ),
      },
      dateColumn('Planned Start', 'planned_start_date'),
      dateColumn('Planned End', 'planned_end_date'),
      dateColumn('Actual Start', 'actual_start_date'),
      dateColumn('Actual End', 'actual_end_date'),
      {
        title: 'Expected Deliverable',
        dataIndex: 'expected_deliverable',
        key: 'expected_deliverable',
        ellipsis: true,
        onHeaderCell: nowrapHeader,
      },
      {
        title: 'Activity Status',
        key: 'status',
        width: STATUS_COLUMN_WIDTH,
        align: 'center',
        filters: STATUS_FILTER_KEYS.map((key) => ({ text: STATUS[key].label, value: key })),
        filteredValue: filteredInfo.status ?? null,
        onFilter: (value, record) => deriveStatus(record) === value,
        onHeaderCell: nowrapHeader,
        render: (_, record) => <StatusBadge status={deriveStatus(record)} />,
      },
    ]

    if (!showActionColumn) return baseColumns

    return [
      ...baseColumns,
      {
        title: 'Activity Action',
        key: 'actions',
        fixed: 'right',
        width: ACTION_COLUMN_WIDTH,
        align: 'center',
        onHeaderCell: nowrapHeader,
        render: (_, record) => (
          <ActivityActions
            isPlanner={isPlanner}
            actionsOpen={actionsOpenId === record.id}
            onActionsOpenChange={(open) => onActionsOpenChange?.(open ? record.id : null)}
            canSaveDocument={pendingDocumentActivityId === record.id}
            onReview={() => onReview(record)}
            onUploadDocument={() => onUploadDocument?.(record)}
            onSaveDocument={() => onSaveDocument?.(record)}
            onSubmitPlan={() => onSubmitPlan?.(record)}
            onUpdateDates={() => onUpdateDates?.(record)}
          />
        ),
      },
    ]
  }, [
    showActionColumn,
    isPlanner,
    actionsOpenId,
    filteredInfo.status,
    pendingDocumentActivityId,
    onActionsOpenChange,
    onReview,
    onUploadDocument,
    onSaveDocument,
    onSubmitPlan,
    onUpdateDates,
  ])

  return (
    <div
      className="pms-table-shell rounded-xl"
      style={{ border: '1px solid #ECE8E4', boxShadow: '0 4px 18px rgba(0,0,0,.045)', overflow: 'hidden' }}
    >
      <ConfigProvider
        theme={{
          components: {
            Table: {
              headerBg: '#962c30',
              headerColor: '#ffffff',
              headerSplitColor: 'rgba(255,255,255,.22)',
              rowHoverBg: isDark ? PMS_DARK_ROW_HOVER : '#FFFDF9',
              colorBgContainer: isDark ? PMS_DARK_BG_CONTAINER : undefined,
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
          scroll={{ x: 'max-content' }}
          pagination={false}
          rowClassName={(record) => (record.id === selectedRowId ? 'selected-row' : '')}
          onRow={(record) => ({
            onClick: () => setSelectedRowId((prev) => (prev === record.id ? null : record.id)),
          })}
        />
      </ConfigProvider>
      <div
        className="text-[#667085] dark:text-gray-400"
        style={{ padding: '14px 20px', borderTop: '1px solid var(--pms-border)', fontSize: 13 }}
      >
        Showing 1–{visibleActivities.length} of {activities.length} activities
      </div>
    </div>
  )
}

export default ActivitiesTable
