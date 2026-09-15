// One line in an activity/security feed — a severity dot, a label, an
// optional sub-line, and a right-aligned relative time. Shared by
// Administrator's audit/user-management feeds so both read identically.
export default function ActivityRow({ label, sub, when, severity }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-100 py-2.5 last:border-b-0">
      <div className="flex items-start gap-2.5">
        <span
          className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ background: severity === 'danger' ? '#C0392B' : severity === 'good' ? '#2E9E55' : '#9CA3AF' }}
        />
        <div>
          <div className="text-sm font-semibold" style={severity === 'danger' ? { color: '#C0392B' } : undefined}>
            {label}
          </div>
          {sub && <div className="text-xs text-gray-400">{sub}</div>}
        </div>
      </div>
      <div className="whitespace-nowrap text-xs text-gray-400">{when}</div>
    </div>
  )
}
