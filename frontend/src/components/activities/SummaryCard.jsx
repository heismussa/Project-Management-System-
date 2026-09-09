function SummaryCard({ icon, title, value, description, accent }) {
  return (
    <div
      className="flex flex-col justify-between rounded-xl bg-white"
      style={{
        border: '1px solid #ECE8E4',
        boxShadow: '0 4px 16px rgba(0,0,0,.04)',
        minHeight: 125,
        padding: '22px 24px',
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: accent.soft, color: accent.strong }}
        >
          {icon}
        </span>
        <span className="text-sm font-medium" style={{ color: '#667085' }}>
          {title}
        </span>
      </div>
      <div>
        <div className="text-[28px] font-bold leading-tight" style={{ color: accent.strong }}>
          {value}
        </div>
        {description && (
          <div className="mt-0.5 text-xs" style={{ color: '#667085' }}>
            {description}
          </div>
        )}
      </div>
    </div>
  )
}

export default SummaryCard
