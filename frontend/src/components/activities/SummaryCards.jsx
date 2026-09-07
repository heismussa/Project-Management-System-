import { ClipboardList, CheckCircle2, Clock, CircleDashed } from 'lucide-react'
import SummaryCard from './SummaryCard'
import { deriveStatus } from '../../lib/status'

const ACCENTS = {
  maroon: { soft: '#F6E7EA', strong: '#7A0C22' },
  green: { soft: '#E8F6EC', strong: '#278A45' },
  gold: { soft: '#FFF4D8', strong: '#B97900' },
  gray: { soft: '#F2F3F5', strong: '#555F6D' },
}

function percentOf(count, total) {
  return total === 0 ? '0.0' : ((count / total) * 100).toFixed(1)
}

// Counts are derived live from `activities` (the actual data), never
// hardcoded — this recomputes on every render as activities change.
function SummaryCards({ activities }) {
  const total = activities.length
  const completed = activities.filter((activity) => deriveStatus(activity) === 'completed').length
  const ongoing = activities.filter((activity) => deriveStatus(activity) === 'ongoing').length
  const notStarted = activities.filter((activity) => deriveStatus(activity) === 'not_started').length

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        icon={<ClipboardList size={20} />}
        title="Total Activities"
        value={total}
        accent={ACCENTS.maroon}
      />
      <SummaryCard
        icon={<CheckCircle2 size={20} />}
        title="Completed"
        value={completed}
        description={`${percentOf(completed, total)}% of total`}
        accent={ACCENTS.green}
      />
      <SummaryCard
        icon={<Clock size={20} />}
        title="Ongoing"
        value={ongoing}
        description={`${percentOf(ongoing, total)}% of total`}
        accent={ACCENTS.gold}
      />
      <SummaryCard
        icon={<CircleDashed size={20} />}
        title="Not Started"
        value={notStarted}
        description={`${percentOf(notStarted, total)}% of total`}
        accent={ACCENTS.gray}
      />
    </div>
  )
}

export default SummaryCards
