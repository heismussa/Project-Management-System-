import { useState } from 'react'
import { Plus } from 'lucide-react'
import { deriveStatus } from '../lib/status'
import ActivityFormModal from '../components/activities/ActivityFormModal'
import ProgressUpdateModal from '../components/activities/ProgressUpdateModal'
import PlanExportButton from '../components/activities/PlanExportButton'
import PageHeader from '../components/activities/PageHeader'
import SummaryCards from '../components/activities/SummaryCards'
import ActivitiesTable from '../components/activities/ActivitiesTable'
import { activities as seedActivities } from '../data/activities'
import { progressUpdates as seedProgressUpdates } from '../data/progressUpdates'
import { people } from '../data/people'

const BLANK_ACTIVITY = {
  id: null,
  name: '',
  expected_deliverable: '',
  planned_start_date: null,
  planned_end_date: null,
  responsible_person_id: null,
}

function ImplementationPlanPage() {
  const [activities, setActivities] = useState(seedActivities)
  const [progressUpdates, setProgressUpdates] = useState(seedProgressUpdates)
  const [formTarget, setFormTarget] = useState(null)
  const [progressTarget, setProgressTarget] = useState(null)
  const [filteredInfo, setFilteredInfo] = useState({})

  const handleSaveForm = (values) => {
    if (formTarget.id == null) {
      const newId = activities.length ? Math.max(...activities.map((a) => a.id)) + 1 : 1
      setActivities((prev) => [
        ...prev,
        {
          id: newId,
          project_id: 1,
          actual_start_date: null,
          actual_end_date: null,
          status: 'not_started',
          ...values,
        },
      ])
    } else {
      setActivities((prev) =>
        prev.map((activity) => (activity.id === formTarget.id ? { ...activity, ...values } : activity)),
      )
    }
    setFormTarget(null)
  }

  const handleDelete = (id) => {
    setActivities((prev) => prev.filter((activity) => activity.id !== id))
  }

  const handleSaveProgress = ({ actual_start_date, actual_end_date, remark }) => {
    const status = deriveStatus({ actual_start_date, actual_end_date })
    const newLogEntry = {
      id: progressUpdates.length ? Math.max(...progressUpdates.map((p) => p.id)) + 1 : 1,
      entity_type: 'activity',
      entity_id: progressTarget.id,
      actual_start_date,
      actual_end_date,
      remark,
      test_result: null,
      test_comments: null,
      status,
      created_at: new Date().toISOString(),
    }
    setProgressUpdates((prev) => [...prev, newLogEntry])
    setActivities((prev) =>
      prev.map((activity) =>
        activity.id === progressTarget.id
          ? { ...activity, actual_start_date, actual_end_date, status }
          : activity,
      ),
    )
    setProgressTarget(null)
  }

  // Filtering is applied here (not via each column's onFilter) so the
  // resulting array's order/indices match exactly what the Table renders —
  // ActivitiesTable's phase-merge rowSpan logic needs that to stay correct.
  const visibleActivities = activities.filter((activity) => {
    const phaseFilter = filteredInfo.phase
    if (phaseFilter?.length && !phaseFilter.includes(activity.phase)) return false
    const statusFilter = filteredInfo.status
    if (statusFilter?.length && !statusFilter.includes(deriveStatus(activity))) return false
    return true
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Implementation Plan & Deliverables"
        actions={
          <>
            <PlanExportButton activities={activities} />
            <button
              type="button"
              onClick={() => setFormTarget(BLANK_ACTIVITY)}
              className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: '#7A0C22', height: 42, padding: '0 22px' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#650018'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#7A0C22'
              }}
            >
              <Plus size={16} />
              Add activity
            </button>
          </>
        }
      />

      <SummaryCards activities={activities} />

      <ActivitiesTable
        activities={activities}
        visibleActivities={visibleActivities}
        filteredInfo={filteredInfo}
        onTableChange={(_pagination, filters) => setFilteredInfo(filters)}
        onEdit={setFormTarget}
        onUpdateProgress={setProgressTarget}
        onDelete={handleDelete}
      />

      <ActivityFormModal
        open={formTarget !== null}
        activity={formTarget}
        people={people}
        onCancel={() => setFormTarget(null)}
        onSave={handleSaveForm}
      />
      <ProgressUpdateModal
        open={progressTarget !== null}
        activity={progressTarget}
        history={progressUpdates.filter(
          (update) => update.entity_type === 'activity' && update.entity_id === progressTarget?.id,
        )}
        onCancel={() => setProgressTarget(null)}
        onSave={handleSaveProgress}
      />
    </div>
  )
}

export default ImplementationPlanPage
