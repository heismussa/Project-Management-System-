import { Tag } from 'antd'

const REVIEW_STATUS = {
  pending: { label: 'Pending', color: 'default' },
  approved: { label: 'Approved', color: '#068737' },
  returned: { label: 'Returned', color: '#ffc20a' },
}

function ReviewStatusBadge({ status }) {
  const entry = REVIEW_STATUS[status]
  if (!entry) return null
  return <Tag color={entry.color}>{entry.label}</Tag>
}

export default ReviewStatusBadge
