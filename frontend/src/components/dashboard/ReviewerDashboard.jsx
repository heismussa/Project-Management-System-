import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Typography, message } from 'antd'
import api from '../../lib/axios'
import { unwrapItem } from '../../lib/apiHelpers'

const { Title, Text } = Typography

const MAROON = '#962c30'
const GREEN = '#068737'

const QUEUE_CARDS = [
  { key: 'new_registrations', label: 'New registrations', description: 'Initiation docs missing', path: '/projects?lifecycleStage=initiation' },
  { key: 'plans_pending', label: 'Plans pending review', description: 'Awaiting your decision', path: '/reviews?tab=plan' },
  { key: 'matrices_pending', label: 'Requirement matrices', description: 'Awaiting approval', path: '/traceability-matrix' },
  { key: 'documents_pending', label: 'Documents pending', description: 'Needs your review', path: '/documents' },
  { key: 'returned_unresolved', label: 'Returned unresolved', description: 'Needs follow-up', path: '/documents' },
  { key: 'closure_signoffs', label: 'Closure sign-offs', description: 'All gates passed', path: '/reviews?tab=closure' },
]

function QueueCard({ label, description, value, onClick }) {
  return (
    <Card
      hoverable
      className="page-shell-card"
      onClick={onClick}
      styles={{ body: { padding: 16 } }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onClick()
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: MAROON }}>{label}</div>
      <div className="mt-1" style={{ fontSize: 24, fontWeight: 500 }}>
        {value}
      </div>
      <Text type="secondary" style={{ fontSize: 10 }}>
        {description}
      </Text>
    </Card>
  )
}

function TurnaroundCard({ label, value, unit }) {
  return (
    <div className="flex flex-col items-center text-center">
      <Text type="secondary" className="text-xs">
        {label}
      </Text>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <Text type="secondary" className="text-xs">
        {unit}
      </Text>
    </div>
  )
}

// Catmull-Rom -> cubic-Bezier conversion for a smooth, non-jagged polyline.
function smoothPath(points) {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return d
}

const CHART_WIDTH = 760
const CHART_HEIGHT = 160
const CHART_LEFT = 32
const CHART_TOP = 10
const CHART_BOTTOM_LABELS = 22

function ReviewLoadChart({ reviewLoad }) {
  const maxValue = Math.max(10, ...reviewLoad.flatMap((row) => [row.received, row.completed]))
  const gridMax = Math.ceil(maxValue / 10) * 10
  const gridSteps = gridMax / 10
  const plotWidth = CHART_WIDTH - CHART_LEFT - 10
  const plotHeight = CHART_HEIGHT

  const xFor = (index) => CHART_LEFT + (index / (reviewLoad.length - 1)) * plotWidth
  const yFor = (value) => CHART_TOP + plotHeight - (value / gridMax) * plotHeight

  const receivedPoints = reviewLoad.map((row, index) => ({ x: xFor(index), y: yFor(row.received) }))
  const completedPoints = reviewLoad.map((row, index) => ({ x: xFor(index), y: yFor(row.completed) }))

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_TOP + CHART_HEIGHT + CHART_BOTTOM_LABELS}`}
      className="w-full"
      role="img"
      aria-label="Review load by month"
    >
      {Array.from({ length: gridSteps + 1 }, (_, step) => {
        const value = step * 10
        const y = yFor(value)
        return (
          <g key={value}>
            <line x1={CHART_LEFT} y1={y} x2={CHART_WIDTH - 10} y2={y} stroke="#EAECF0" strokeWidth={1} />
            <text x={CHART_LEFT - 8} y={y + 3} textAnchor="end" fontSize={10} fill="#98A2B3">
              {value}
            </text>
          </g>
        )
      })}

      {reviewLoad.map((row, index) => (
        <text
          key={row.month}
          x={xFor(index)}
          y={CHART_TOP + plotHeight + 16}
          textAnchor="middle"
          fontSize={10}
          fill="#98A2B3"
        >
          {row.month}
        </text>
      ))}

      <path d={smoothPath(receivedPoints)} fill="none" stroke={MAROON} strokeWidth={2} />
      <path d={smoothPath(completedPoints)} fill="none" stroke={GREEN} strokeWidth={2} />
    </svg>
  )
}

function ReviewerDashboard() {
  const navigate = useNavigate()
  const [reviewer, setReviewer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get('/dashboard', { params: { role: 'Project Reviewer' } })
      .then((response) => {
        if (cancelled) return
        setReviewer(unwrapItem(response.data)?.reviewer ?? null)
      })
      .catch(() => {
        if (!cancelled) message.error('Could not load the review queue.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || !reviewer) {
    return (
      <Card className="page-shell-card" loading={loading}>
        {!loading && <Text type="secondary">No dashboard data available.</Text>}
      </Card>
    )
  }

  const { queue, review_load: reviewLoad, turnaround } = reviewer

  return (
    <div className="flex flex-col gap-3">
      <Title level={5} className="!mb-0" style={{ fontSize: 15, fontWeight: 500 }}>
        Your review queue
      </Title>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUEUE_CARDS.map((card) => (
          <QueueCard
            key={card.key}
            label={card.label}
            description={card.description}
            value={queue[card.key]}
            onClick={() => navigate(card.path)}
          />
        ))}
      </div>

      <Card className="page-shell-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Text strong>Review load overview</Text>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: MAROON }} />
              Received
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: GREEN }} />
              Completed
            </span>
          </div>
        </div>
        <ReviewLoadChart reviewLoad={reviewLoad} />
      </Card>

      <Card className="page-shell-card" title="Turnaround performance">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <TurnaroundCard label="Avg review time" value={turnaround.avg_review_days} unit="days" />
          <TurnaroundCard label="Reviewed this month" value={turnaround.reviewed_this_month} unit="reviews" />
          <TurnaroundCard label="Backlog" value={turnaround.backlog} unit="items" />
          <TurnaroundCard label="Return rate" value={`${turnaround.return_rate}%`} unit="of decisions" />
        </div>
      </Card>
    </div>
  )
}

export default ReviewerDashboard
