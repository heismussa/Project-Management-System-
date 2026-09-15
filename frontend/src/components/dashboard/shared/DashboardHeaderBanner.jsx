import { Space, Typography } from 'antd'
import { useAuth } from '../../../context/AuthContext'

const { Title, Text } = Typography

// Same maroon as the top header bar, with the app's yellow accent (the
// Support Desk strip, the user avatar chip) carried into the text instead
// of the background — the inverse pairing of those same two brand colors.
const MAROON = '#902d30'
const YELLOW = '#f9c000'

// Greets word-by-word instead of all at once — each word rises and fades
// in on its own short delay, so the line reads as a single gentle wave
// rather than a static heading. `prefers-reduced-motion` (see index.css)
// turns this back into a plain, instant heading.
// Remount via `animationKey` (role / name) so the wave replays on refresh
// and when the user switches roles.
function WaveGreeting({ text, animationKey }) {
  const words = text.split(' ')
  return (
    <span key={animationKey} className="dashboard-banner-greeting" aria-label={text}>
      {words.map((word, index) => (
        <span
          key={`${animationKey}-${word}-${index}`}
          className="dashboard-banner-greeting__word"
          style={{ animationDelay: `${index * 0.14}s` }}
        >
          {word}
          {index < words.length - 1 ? '\u00a0' : ''}
        </span>
      ))}
    </span>
  )
}

/**
 * The banner at the top of every role's dashboard — a personal greeting
 * (not a generic page label). `subtitle` is optional and only worth
 * passing when it's live/dynamic information (e.g. a queue count) rather
 * than a static description of the page.
 */
export default function DashboardHeaderBanner({ subtitle, actions }) {
  const { user, activeRole } = useAuth()
  const fullName = user?.full_name ?? user?.name ?? 'Guest'
  const animationKey = `${activeRole?.name ?? 'none'}::${fullName}`

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-6"
      style={{ background: MAROON }}
    >
      <div>
        <Title
          level={3}
          className="!mb-1"
          style={{ color: YELLOW, fontFamily: 'var(--heading)', letterSpacing: 0.3, fontSize: 28 }}
        >
          <WaveGreeting text={`Welcome, ${fullName}`} animationKey={animationKey} />
        </Title>
        {subtitle && <Text style={{ color: 'rgba(249,192,0,0.8)' }}>{subtitle}</Text>}
      </div>
      {actions && <Space wrap>{actions}</Space>}
    </div>
  )
}
