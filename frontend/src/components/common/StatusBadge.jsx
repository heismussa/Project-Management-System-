import { STATUS } from '../../lib/status'

function StatusBadge({ status }) {
  const entry = STATUS[status]
  if (!entry) return null
  return (
    <span
      style={{
        display: 'inline-block',
        background: entry.bg,
        color: entry.text,
        padding: '5px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {entry.label}
    </span>
  )
}

export default StatusBadge
