import { useState } from 'react'
import { Table, Badge, Space, Button, Tooltip, Tag } from 'antd'
import { PlusOutlined, EditOutlined, SyncOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { deriveStatus, STATUS_BADGE } from './status'
import PlanningModal from './PlanningModal'
import ProgressModal from './ProgressModal'

function formatDate(value) {
  return value ? dayjs(value).format('MMM D, YYYY') : '—'
}

const BLANK_ACTIVITY = {
  id: null,
  name: '',
  deliverable: '',
  plannedStart: null,
  plannedEnd: null,
  team: [],
}

function ActivityTable({ activities, onChange }) {
  const [planningTarget, setPlanningTarget] = useState(null)
  const [progressTarget, setProgressTarget] = useState(null)

  const handleSavePlanning = (values) => {
    if (planningTarget.id == null) {
      const newId = activities.length ? Math.max(...activities.map((a) => a.id)) + 1 : 1
      onChange([
        ...activities,
        { id: newId, actualStart: null, actualEnd: null, remarks: [], ...values },
      ])
    } else {
      onChange(
        activities.map((activity) =>
          activity.id === planningTarget.id ? { ...activity, ...values } : activity,
        ),
      )
    }
    setPlanningTarget(null)
  }

  const handleSaveProgress = ({ actualStart, actualEnd, remark }) => {
    onChange(
      activities.map((activity) => {
        if (activity.id !== progressTarget.id) return activity
        const remarks = remark
          ? [...activity.remarks, { id: Date.now(), date: new Date().toISOString(), text: remark }]
          : activity.remarks
        return { ...activity, actualStart, actualEnd, remarks }
      }),
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
      dataIndex: 'deliverable',
      key: 'deliverable',
    },
    {
      title: 'Planned start',
      dataIndex: 'plannedStart',
      key: 'plannedStart',
      render: formatDate,
    },
    {
      title: 'Planned end',
      dataIndex: 'plannedEnd',
      key: 'plannedEnd',
      render: formatDate,
    },
    {
      title: 'Actual start',
      dataIndex: 'actualStart',
      key: 'actualStart',
      render: formatDate,
    },
    {
      title: 'Actual end',
      dataIndex: 'actualEnd',
      key: 'actualEnd',
      render: formatDate,
    },
    {
      title: 'Team',
      dataIndex: 'team',
      key: 'team',
      render: (team) => (
        <Space size={[0, 4]} wrap>
          {team.map((member) => (
            <Tag key={member}>{member}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        const status = deriveStatus(record.actualStart, record.actualEnd)
        return <Badge status={STATUS_BADGE[status]} text={status} />
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit planning">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => setPlanningTarget(record)}
            />
          </Tooltip>
          <Tooltip title="Update progress">
            <Button
              type="text"
              icon={<SyncOutlined />}
              onClick={() => setProgressTarget(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Implementation Plan &amp; Deliverables</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setPlanningTarget(BLANK_ACTIVITY)}>
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

      <PlanningModal
        open={planningTarget !== null}
        activity={planningTarget}
        onCancel={() => setPlanningTarget(null)}
        onSave={handleSavePlanning}
      />
      <ProgressModal
        open={progressTarget !== null}
        activity={progressTarget}
        onCancel={() => setProgressTarget(null)}
        onSave={handleSaveProgress}
      />
    </div>
  )
}

export default ActivityTable
