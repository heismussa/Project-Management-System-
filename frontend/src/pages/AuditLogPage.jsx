import { useCallback, useEffect, useState } from 'react'
import { Card, Table, Tag, Typography, message } from 'antd'
import dayjs from 'dayjs'
import api from '../lib/axios'

const { Text } = Typography

const ACTION_LABELS = {
  login_success: { label: 'Login', color: 'green' },
  login_failed: { label: 'Failed login', color: 'volcano' },
  login_blocked_disabled: { label: 'Blocked (disabled account)', color: 'red' },
  logout: { label: 'Logout', color: 'default' },
  document_viewed: { label: 'Document viewed', color: 'blue' },
}

/**
 * ICT Support / Administrator only — read-only security trail (logins,
 * failed logins, logouts, document views). Separate from the "recent account
 * activity" widget on the ICT Support dashboard, which stays about user
 * management (created/enabled/password reset) only.
 */
function AuditLogPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25, total: 0 })

  const loadLogs = useCallback(async (page = 1, pageSize = 25) => {
    setLoading(true)
    try {
      const response = await api.get('/admin/audit-logs', { params: { page, per_page: pageSize } })
      const payload = response.data
      setLogs(payload.data || [])
      setPagination({
        current: payload.current_page || 1,
        pageSize: payload.per_page || pageSize,
        total: payload.total || 0,
      })
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not load the audit log.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLogs(1, 25)
  }, [loadLogs])

  const columns = [
    {
      title: 'When',
      dataIndex: 'created_at',
      width: 170,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (value) => (value ? dayjs(value).format('MMM D, YYYY h:mm A') : '—'),
    },
    {
      title: 'User',
      key: 'user',
      width: 220,
      render: (_, record) =>
        record.user ? (
          <span>
            <Text strong>{record.user.name}</Text>
            <br />
            <Text type="secondary" className="text-xs">
              {record.user.email}
            </Text>
          </span>
        ) : (
          <Text type="secondary">Unknown</Text>
        ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      width: 190,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (value) => {
        const meta = ACTION_LABELS[value] || { label: value, color: 'default' }
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: 'Details',
      dataIndex: 'description',
      render: (value) => value || '—',
    },
    {
      title: 'IP address',
      dataIndex: 'ip_address',
      width: 140,
      render: (value) => value || '—',
    },
  ]

  return (
    <div className="page-container">
      <Card className="page-shell-card" styles={{ body: { padding: 10 } }}>
       

        <Table
          rowKey="id"
          className="ictms-table pms-house-table"
          columns={columns}
          dataSource={logs}
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
          }}
          onChange={(next) => loadLogs(next.current, next.pageSize)}
          locale={{ emptyText: 'No activity recorded yet.' }}
        />
      </Card>
    </div>
  )
}

export default AuditLogPage
