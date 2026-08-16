import { Tag } from 'antd'
import { STATUS } from '../../lib/status'

function StatusBadge({ status }) {
  const entry = STATUS[status]
  if (!entry) return null
  return <Tag color={entry.color}>{entry.label}</Tag>
}

export default StatusBadge
