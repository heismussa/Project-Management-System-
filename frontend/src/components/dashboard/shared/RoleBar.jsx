import { Typography } from 'antd'
import { BRAND_MAROON } from './chartConstants'

const { Text } = Typography

// Shortened labels for the role-distribution bar — Administrator and ICT
// Support both show this same breakdown, just built from a different
// dashboard payload.
const ROLE_LABELS = {
  'Project Planner': 'Planner',
  'Project Reviewer': 'Reviewer',
  'Project ViewOnly': 'View Only',
  'Project Coordinator': 'Coordinator',
  'Project Approver': 'Approver',
  'Project Administrator': 'Administrator',
}

export default function RoleBar({ label, count, maxCount }) {
  return (
    <div className="flex items-center gap-3">
      <Text type="secondary" className="shrink-0 text-xs" style={{ width: 100 }}>
        {ROLE_LABELS[label] ?? label}
      </Text>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-2.5 rounded-full"
          style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`, background: BRAND_MAROON }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-sm font-semibold">{count}</span>
    </div>
  )
}
