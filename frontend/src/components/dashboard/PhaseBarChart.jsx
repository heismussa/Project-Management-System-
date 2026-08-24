import { BRAND_MAROON, PHASE_LABELS } from './chartConstants'

const BAR_CHART_HEIGHT = 90

// Vertical bar chart for a phase_enum distribution. Shared by every panel
// that shows phase counts so the treatment stays identical everywhere.
// Pass onSelect to make bars clickable; omit it for a read-only rendering.
export default function PhaseBarChart({ phaseCounts, onSelect }) {
  const maxCount = Math.max(1, ...Object.values(phaseCounts))
  const interactive = typeof onSelect === 'function'

  return (
    <div className="flex items-end gap-4" style={{ height: BAR_CHART_HEIGHT + 40 }}>
      {Object.entries(phaseCounts).map(([stage, count]) => (
        <div
          key={stage}
          className={`flex flex-1 flex-col items-center${interactive ? ' cursor-pointer' : ''}`}
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          onClick={interactive ? () => onSelect(stage) : undefined}
          onKeyDown={
            interactive
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') onSelect(stage)
                }
              : undefined
          }
        >
          <span className="mb-1 text-sm font-semibold">{count}</span>
          <div className="flex w-full items-end justify-center" style={{ height: BAR_CHART_HEIGHT }}>
            <div
              className="w-full max-w-[56px]"
              style={{
                height: Math.round((count / maxCount) * BAR_CHART_HEIGHT),
                background: BRAND_MAROON,
                borderRadius: '3px 3px 0 0',
              }}
            />
          </div>
          <span className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{PHASE_LABELS[stage] ?? stage}</span>
        </div>
      ))}
    </div>
  )
}
