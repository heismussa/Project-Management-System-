// Shared stat tile used across every dashboard — was previously copy-pasted
// per-file with small drifting differences (PlannerDashboard, ViewOnlyDashboard,
// IctSupportDashboard each had their own). One definition now, so a visual
// change here reaches every dashboard instead of needing repeating six times.
export default function TintedMetricCard({ icon: Icon, label, value, subtext, theme, linkLabel, onLinkClick }) {
  return (
    <div
      style={{
        background: theme.background,
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        padding: '20px 22px',
        height: '100%',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            style={{
              color: theme.accent,
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            {label}
          </div>
          <div style={{ color: theme.accent, fontSize: 32, fontWeight: 700, marginTop: 7, letterSpacing: -0.5 }}>
            {value}
          </div>
          {subtext && <div style={{ color: '#6b7280', fontSize: 12.5, marginTop: 3 }}>{subtext}</div>}
        </div>
        {Icon && (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: `${theme.accent}1F`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={19} color={theme.accent} />
          </div>
        )}
      </div>
      {linkLabel && (
        <>
          <div className="mt-3" style={{ borderTop: `1px solid ${theme.divider}` }} />
          <button
            type="button"
            className="mt-3 text-sm font-semibold"
            style={{ color: theme.link }}
            onClick={onLinkClick}
          >
            {linkLabel}
          </button>
        </>
      )}
    </div>
  )
}
