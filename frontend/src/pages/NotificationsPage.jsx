import { useEffect, useState } from 'react'
import { Card, Table, Tag, Typography, message } from 'antd'
import dayjs from 'dayjs'
import api from '../lib/axios'
import { unwrapList } from '../lib/apiHelpers'

const { Title, Paragraph } = Typography

export default function NotificationsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api
      .get('/notifications')
      .then((response) => setItems(unwrapList(response.data)))
      .catch(() => message.error('Could not load notifications.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <Title level={4} className="!mb-1">
        Notifications
      </Title>
      <Paragraph type="secondary">Deadline and workflow alerts for your account.</Paragraph>
      <Card className="page-shell-card">
        <Table
          className="pms-house-table"
          rowKey="id"
          loading={loading}
          dataSource={items}
          locale={{ emptyText: 'No notifications yet.' }}
          columns={[
            { title: 'SN', width: 56, align: 'center', render: (_, __, index) => index + 1 },
            { title: 'Type', dataIndex: 'type', render: (value) => <Tag>{value}</Tag> },
            { title: 'Message', dataIndex: 'message' },
            {
              title: 'Read',
              dataIndex: 'is_read',
              render: (value) => (value ? 'Yes' : 'No'),
            },
            {
              title: 'When',
              dataIndex: 'created_at',
              render: (value) => (value ? dayjs(value).format('MMM D, YYYY h:mm A') : '—'),
            },
          ]}
        />
      </Card>
    </div>
  )
}
