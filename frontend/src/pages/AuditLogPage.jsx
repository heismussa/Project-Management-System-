import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Input, Space, Table, Tag, Tooltip, Typography, message } from 'antd'
import { DownloadOutlined, SearchOutlined, WarningFilled } from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../lib/axios'
import { exportExcel } from '../lib/reportExport'

const { Text } = Typography

const ACTION_LABELS = {
  login_success: { label: 'Login', color: 'green' },
  login_failed: { label: 'Failed login', color: 'volcano' },
  login_blocked_disabled: { label: 'Blocked (disabled account)', color: 'red' },
  logout: { label: 'Logout', color: 'default' },
  document_viewed: { label: 'Document viewed', color: 'blue' },
  access_denied: { label: 'Access denied', color: 'red' },
  account_created: { label: 'Account created', color: 'geekblue' },
  role_assigned: { label: 'Roles changed', color: 'geekblue' },
  password_reset: { label: 'Password reset', color: 'gold' },
  account_enabled: { label: 'Account enabled', color: 'green' },
  account_disabled: { label: 'Account disabled', color: 'red' },
}

function actionMeta(value) {
  return ACTION_LABELS[value] || { label: value, color: 'default' }
}

/**
 * ICT Support / Administrator only — the full security trail: logins,
 * failed logins, logouts, document views, denied access attempts, and
 * account-management events (which also still feed the ICT Support
 * dashboard's smaller "recent activity" widget, untouched).
 */
function AuditLogPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25, total: 0 })
  const [search, setSearch] = useState('')

  const loadLogs = useCallback(
    async (page = 1, pageSize = 25) => {
      setLoading(true)
      try {
        const response = await api.get('/admin/audit-logs', {
          params: { page, per_page: pageSize, search: search.trim() || undefined },
        })
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
    },
    [search],
  )

  useEffect(() => {
    loadLogs(1, pagination.pageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload from page 1 whenever the search changes
  }, [search])

  const exportLog = async () => {
    setExporting(true)
    try {
      const response = await api.get('/admin/audit-logs', {
        params: { page: 1, per_page: 5000, search: search.trim() || undefined },
      })
      const rows = (response.data.data || []).map((row) => ({
        when: row.created_at ? dayjs(row.created_at).format('MMM D, YYYY h:mm A') : '',
        user: row.user ? `${row.user.name} (${row.user.email})` : 'Unknown',
        action: actionMeta(row.action).label,
        details: row.description || '',
        ip: row.ip_address || '',
      }))
      await exportExcel({
        filename: `audit-log-${dayjs().format('YYYY-MM-DD')}.xlsx`,
        sheets: [
          {
            name: 'Audit Log',
            columns: [
              { header: 'When', key: 'when', width: 20 },
              { header: 'User', key: 'user', width: 32 },
              { header: 'Action', key: 'action', width: 20 },
              { header: 'Details', key: 'details', width: 40 },
              { header: 'IP Address', key: 'ip', width: 16 },
            ],
            rows,
          },
        ],
      })
      message.success(`Exported ${rows.length} entries`)
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not export the audit log.')
    } finally {
      setExporting(false)
    }
  }

  const columns = [
    {
      title: 'When',
      dataIndex: 'created_at',
      width: 150,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (value) => (value ? dayjs(value).format('MMM D, YYYY h:mm A') : '—'),
    },
    {
      title: 'User',
      key: 'user',
      width: 190,
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
      width: 160,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (value, record) => {
        const badgeMeta = actionMeta(value)
        return (
          <Space size={4}>
            <Tag color={badgeMeta.color}>{badgeMeta.label}</Tag>
            {record.flagged && (
              <Tooltip title="3 or more failed logins for this account within 15 minutes">
                <WarningFilled style={{ color: '#cf1322' }} />
              </Tooltip>
            )}
          </Space>
        )
      },
    },
    {
      title: 'Details',
      dataIndex: 'description',
      width: 90,
      ellipsis: true,
      render: (value) => value || '—',
    },
    {
      title: 'IP Address',
      dataIndex: 'ip_address',
      width: 140,
      render: (value) => value || '—',
    },
  ]

  return (
    <div className="page-container">
      <Card className="page-shell-card" style={{ marginTop: 0 }} styles={{ body: { padding: 10 } }}>
        <Space wrap className="mb-2" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Input
            allowClear
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder="Search user, details, or IP address"
            className="w-72"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button icon={<DownloadOutlined />} loading={exporting} onClick={exportLog}>
            Export
          </Button>
        </Space>

        <Table
          rowKey="id"
          className="ictms-table pms-house-table"
          tableLayout="fixed"
          columns={columns}
          dataSource={logs}
          loading={loading}
          rowClassName={(record) => (record.flagged ? 'bg-red-50' : '')}
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
