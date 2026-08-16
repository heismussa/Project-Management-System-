import { useState } from 'react'
import { Table, Space, Button, Tooltip, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, SyncOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { STATUS, deriveStatus } from '../../lib/status'
import StatusBadge from '../common/StatusBadge'
import ActivityFormModal from './ActivityFormModal'
import ProgressUpdateModal from './ProgressUpdateModal'
import { activities as seedActivities } from '../../data/activities'
import { progressUpdates as seedProgressUpdates } from '../../data/progressUpdates'
import { people, getPersonName } from '../../data/people'

function formatDate(value) {
  return value ? dayjs(value).format('MMM D, YYYY') : '—'
}

const BLANK_ACTIVITY = {
  id: null,
  name: '',
  expected_deliverable: '',
  planned_start_date: null,
  planned_end_date: null,
  responsible_person_id: null,
}

// pending isn't reachable from deriveStatus() for activities (dates only
// ever resolve to not_started/ongoing/completed), so it's left out here.
const STATUS_FILTER_KEYS = ['not_started', 'ongoing', 'completed']

function ActivityTable() {
  const [activities, setActivities] = useState(seedActivities)
  const [progressUpdates, setProgressUpdates] = useState(seedProgressUpdates)
  const [formTarget, setFormTarget] = useState(null)
  const [progressTarget, setProgressTarget] = useState(null)

  const handleSaveForm = (values) => {
    if (formTarget.id == null) {
      const newId = activities.length ? Math.max(...activities.map((a) => a.id)) + 1 : 1
      setActivities((prev) => [
        ...prev,
        {
          id: newId,
          project_id: 1,
          actual_start_date: null,
          actual_end_date: null,
          status: 'not_started',
          ...values,
        },
      ])
    } else {
      setActivities((prev) =>
        prev.map((activity) => (activity.id === formTarget.id ? { ...activity, ...values } : activity)),
      )
    }
    setFormTarget(null)
  }

  const handleDelete = (id) => {
    setActivities((prev) => prev.filter((activity) => activity.id !== id))
  }

  const handleSaveProgress = ({ actual_start_date, actual_end_date, remark }) => {
    const status = deriveStatus({ actual_start_date, actual_end_date })
    const newLogEntry = {
      id: progressUpdates.length ? Math.max(...progressUpdates.map((p) => p.id)) + 1 : 1,
      entity_type: 'activity',
      entity_id: progressTarget.id,
      actual_start_date,
      actual_end_date,
      remark,
      test_result: null,
      test_comments: null,
      status,
      created_at: new Date().toISOString(),
    }
    setProgressUpdates((prev) => [...prev, newLogEntry])
    setActivities((prev) =>
      prev.map((activity) =>
        activity.id === progressTarget.id
          ? { ...activity, actual_start_date, actual_end_date, status }
          : activity,
      ),
    )
    setProgressTarget(null)
  }

  const columns = [
    {
      title: 'Activity',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
    },
    {
      title: 'Expected deliverable',
      dataIndex: 'expected_deliverable',
      key: 'expected_deliverable',
    },
    {
      title: 'Planned start',
      dataIndex: 'planned_start_date',
      key: 'planned_start_date',
      render: formatDate,
    },
    {
      title: 'Planned end',
      dataIndex: 'planned_end_date',
      key: 'planned_end_date',
      render: formatDate,
    },
    {
      title: 'Actual start',
      dataIndex: 'actual_start_date',
      key: 'actual_start_date',
      render: formatDate,
    },
    {
      title: 'Actual end',
      dataIndex: 'actual_end_date',
      key: 'actual_end_date',
      render: formatDate,
    },
    {
      title: 'Responsible',
      dataIndex: 'responsible_person_id',
      key: 'responsible_person_id',
      render: getPersonName,
    },
    {
      title: 'Status',
      key: 'status',
      filters: STATUS_FILTER_KEYS.map((key) => ({ text: STATUS[key].label, value: key })),
      onFilter: (value, record) => deriveStatus(record) === value,
      render: (_, record) => <StatusBadge status={deriveStatus(record)} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit planning">
            <Button type="text" icon={<EditOutlined />} onClick={() => setFormTarget(record)} />
          </Tooltip>
          <Tooltip title="Update progress">
            <Button type="text" icon={<SyncOutlined />} onClick={() => setProgressTarget(record)} />
          </Tooltip>
          <Popconfirm title="Delete this activity?" onConfirm={() => handleDelete(record.id)}>
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Implementation Plan &amp; Deliverables</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormTarget(BLANK_ACTIVITY)}>
          Add activity
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={activities}
        scroll={{ x: 1300 }}
        pagination={false}
      />

      <ActivityFormModal
        open={formTarget !== null}
        activity={formTarget}
        people={people}
        onCancel={() => setFormTarget(null)}
        onSave={handleSaveForm}
      />
      <ProgressUpdateModal
        open={progressTarget !== null}
        activity={progressTarget}
        history={progressUpdates.filter(
          (update) => update.entity_type === 'activity' && update.entity_id === progressTarget?.id,
        )}
        onCancel={() => setProgressTarget(null)}
        onSave={handleSaveProgress}
      />
    </div>
  )
}

export default ActivityTable
