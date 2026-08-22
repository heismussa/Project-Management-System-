import { Tag } from 'antd'
import { PLAN_STATUS } from '../../context/ProjectContext'

function PlanStatusBadge({ status }) {
  const entry = PLAN_STATUS[status]
  if (!entry) return null
  return <Tag color={entry.color}>{entry.label}</Tag>
}

export default PlanStatusBadge
