import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Typography, message } from 'antd'
import { AlertTriangle, Calendar } from 'lucide-react'
import api from '../../lib/axios'
import { unwrapItem } from '../../lib/apiHelpers'
import { DASHBOARD_CARD_STYLE } from './chartConstants'

const { Text } = Typography

const MAROON = '#962c30'
const DEEP_MAROON = '#650018'
const AMBER = '#ffc20a'
const GREEN = '#068737'
const BLUE = '#1677ff'
const RED = '#b3261e'

const QUEUE_CARDS = [
  { key: 'new_registrations', label: 'New registrations', description: 'Initiation docs missing', path: '/projects?lifecycleStage=initiation', color: MAROON },
  { key: 'plans_pending', label: 'Plans pending review', description: 'Awaiting your decision', path: '/reviews', color: AMBER },
  { key: 'matrices_pending', label: 'Requirement matrices', description: 'Awaiting approval', path: '/projects', color: GREEN },
  { key: 'documents_pending', label: 'Documents for review', description: 'Pending your review', path: '/projects', color: DEEP_MAROON },
  { key: 'returned_unresolved', label: 'Returned items', description: 'Unresolved', path: '/projects', color: RED },
  { key: 'closure_signoffs', label: 'Ready for closure', description: 'All gates passed', path: '/reviews', color: BLUE },
]

const URGENT_ROWS = [
  { key: 'overdue_reviews', label: 'Overdue reviews' },
  { key: 'returned_over_5_days', label: 'Returned over 5 days' },
  { key: 'plans_due_today', label: 'Plans due today' },
]

const UPCOMING_ROWS = [
  { key: 'due_today', label: 'Due today' },
  { key: 'next_3_days', label: 'Next 3 days' },
  { key: 'next_7_days', label: 'Next 7 days' },
]

function QueueCard({ label, description, value, onClick }) {
  return (
    <Card
      hoverable
      onClick={onClick}
      style={{ ...DASHBOARD_CARD_STYLE, height: 108 }}
      styles={{ body: { height: '100%', padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center' } }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onClick()
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: MAROON }}>{label}</div>
      <div className="mt-1" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.15 }}>
        {value}
      </div>
      <Text type="secondary" style={{ fontSize: 11 }}>
        {description}
      </Text>
    </Card>
  )
}

// CSS-based grouped bar chart — bar/gridline heights are plain percentages,
// so it fills whatever height the card grid gives it exactly, with no SVG
// viewBox math and no letterboxing.
function ReviewLoadChart({ reviewLoad }) {
  const maxValue = Math.max(10, ...reviewLoad.flatMap((row) => [row.received, row.completed, row.returned]))
  const gridMax = Math.ceil(maxValue / 10) * 10
  const gridSteps = gridMax / 10
  const steps = Array.from({ length: gridSteps + 1 }, (_, step) => step * 10)

  return (
    <div className="flex h-full w-full flex-1 flex-col" role="img" aria-label="Review load by month">
      <div className="relative flex min-h-0 flex-1">
        <div className="relative w-8 shrink-0">
          {steps.map((value) => (
            <div
              key={value}
              className="absolute right-1 translate-y-1/2"
              style={{ bottom: `${(value / gridMax) * 100}%`, fontSize: 10, color: '#98A2B3' }}
            >
              {value}
            </div>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {steps.map((value) => (
            <div
              key={value}
              className="absolute left-0 right-0 border-t"
              style={{ bottom: `${(value / gridMax) * 100}%`, borderColor: '#EAECF0' }}
            />
          ))}

          <div className="flex h-full items-end justify-between gap-1 px-1">
            {reviewLoad.map((row) => (
              <div key={row.month} className="flex h-full flex-1 items-end justify-center gap-1">
                <div
                  className="w-4 rounded-t-sm"
                  style={{ height: `${(row.received / gridMax) * 100}%`, background: MAROON }}
                />
                <div
                  className="w-4 rounded-t-sm"
                  style={{ height: `${(row.completed / gridMax) * 100}%`, background: GREEN }}
                />
                <div
                  className="w-4 rounded-t-sm"
                  style={{ height: `${(row.returned / gridMax) * 100}%`, background: AMBER }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-1 flex pl-8">
        {reviewLoad.map((row) => (
          <div key={row.month} className="flex-1 text-center" style={{ fontSize: 10, color: '#98A2B3' }}>
            {row.month}
          </div>
        ))}
      </div>
    </div>
  )
}

function ReviewLoadPanel({ reviewLoad }) {
  return (
    <Card
      className="page-shell-card !mt-0 h-full"
      styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column' } }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Text strong style={{ color: MAROON }}>
          Review load overview
        </Text>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: MAROON }} />
            Received
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: GREEN }} />
            Reviewed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: AMBER }} />
            Returned
          </span>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <ReviewLoadChart reviewLoad={reviewLoad} />
      </div>
    </Card>
  )
}

function UrgentAttentionPanel({ urgent, navigate }) {
  return (
    <Card className="page-shell-card !mt-0 flex flex-1 flex-col">
      <div className="flex items-center gap-2 text-sm font-bold" style={{ color: MAROON }}>
        <AlertTriangle size={16} />
        Urgent attention
      </div>
      <div className="mt-3 flex flex-1 flex-col justify-between gap-2">
        {URGENT_ROWS.map((row) => (
          <button
            key={row.key}
            type="button"
            className="flex items-center justify-between rounded-md px-3 py-3 text-left text-sm"
            style={{ background: '#fcebeb' }}
            onClick={() => navigate('/projects')}
          >
            <span>{row.label}</span>
            <span className="font-semibold">{urgent[row.key] ?? 0}</span>
          </button>
        ))}
      </div>
    </Card>
  )
}

function UpcomingDeadlinesPanel({ upcoming, navigate }) {
  return (
    <Card className="page-shell-card !mt-0 flex flex-1 flex-col">
      <div className="flex items-center gap-2 text-sm font-bold" style={{ color: MAROON }}>
        <Calendar size={16} />
        Upcoming deadlines
      </div>
      <div className="mt-3 flex flex-1 flex-col justify-between gap-2">
        {UPCOMING_ROWS.map((row) => (
          <button
            key={row.key}
            type="button"
            className="flex items-center justify-between rounded-md px-3 py-3 text-left text-sm"
            style={{ background: '#fff4d8' }}
            onClick={() => navigate('/projects')}
          >
            <span>{row.label}</span>
            <span className="font-semibold">{upcoming[row.key] ?? 0}</span>
          </button>
        ))}
      </div>
    </Card>
  )
}

function ReviewerDashboard() {
  const navigate = useNavigate()
  const [reviewer, setReviewer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
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
      <Card className="page-shell-card !mt-0" loading={loading}>
        {!loading && <Text type="secondary">No dashboard data available.</Text>}
      </Card>
    )
  }

  const { queue, urgent, upcoming, review_load: reviewLoad } = reviewer

  return (
    <div className="flex min-h-[calc(100vh-180px)] flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {QUEUE_CARDS.map((card) => (
          <QueueCard
            key={card.key}
            label={card.label}
            description={card.description}
            value={queue[card.key] ?? 0}
            onClick={() => navigate(card.path)}
          />
        ))}
      </div>

      <div className="grid flex-1 auto-rows-fr grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
        <ReviewLoadPanel reviewLoad={reviewLoad} />
        <div className="flex h-full flex-col gap-3">
          <UrgentAttentionPanel urgent={urgent} navigate={navigate} />
          <UpcomingDeadlinesPanel upcoming={upcoming} navigate={navigate} />
        </div>
      </div>
    </div>
  )
}

export default ReviewerDashboard
