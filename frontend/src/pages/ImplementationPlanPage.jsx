import { useState } from 'react'
import { message, Modal, Spin, Alert } from 'antd'
import { Plus } from 'lucide-react'
import { deriveStatus } from '../lib/status'
import ActivityFormModal from '../components/activities/ActivityFormModal'
import ProgressUpdateModal from '../components/activities/ProgressUpdateModal'
import PlanExportButton from '../components/activities/PlanExportButton'
import PageHeader from '../components/activities/PageHeader'
import SummaryCards from '../components/activities/SummaryCards'
import ActivitiesTable from '../components/activities/ActivitiesTable'
import ProjectPicker from '../components/common/ProjectPicker'
import { PreventMutation } from '../components/common/RoleGuard'
import { useProjects } from '../hooks/useProjects'
import { useUsers } from '../hooks/useUsers'
import { useActivities, useSaveActivity, useDeleteActivity } from '../hooks/useActivities'
import { getStoredProjectId, storeProjectId } from '../lib/apiHelpers'

const BLANK_ACTIVITY = {
  id: null,
  name: '',
  expected_deliverable: '',
  planned_start_date: null,
  planned_end_date: null,
  responsible_person_id: null,
}

export default function ImplementationPlanPage() {
  const [projectId, setProjectId] = useState(getStoredProjectId)
  const [formTarget, setFormTarget] = useState(null)
  const [progressTarget, setProgressTarget] = useState(null)
  const [filteredInfo, setFilteredInfo] = useState({})

  const { data: projects = [] } = useProjects()
  const { data: users = [] } = useUsers()
  const { data: activities = [], isLoading, isError, error } = useActivities(projectId)

  const saveActivityMutation = useSaveActivity(projectId)
  const deleteActivityMutation = useDeleteActivity(projectId)

  const people = users.map((user) => ({
    id: user.id,
    name: user.name,
    role: user.email,
  }))

  const handleProjectChange = (id) => {
    storeProjectId(id)
    setProjectId(id)
  }

  const handleSaveForm = (values) => {
    saveActivityMutation.mutate(
      { ...values, id: formTarget?.id },
      {
        onSuccess: () => {
          message.success(formTarget?.id ? 'Activity updated' : 'Activity added')
          setFormTarget(null)
        },
        onError: (err) => {
          message.error(err.response?.data?.message || 'Could not save activity.')
        },
      }
    )
  }

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete this activity?',
      content: 'This action cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: () => {
        deleteActivityMutation.mutate(id, {
          onSuccess: () => message.success('Activity deleted'),
          onError: (err) => message.error(err.response?.data?.message || 'Could not delete activity.'),
        })
      },
    })
  }

  const handleSaveProgress = ({ actual_start_date, actual_end_date }) => {
    const status = deriveStatus({ actual_start_date, actual_end_date })
    saveActivityMutation.mutate(
      {
        id: progressTarget.id,
        actual_start_date,
        actual_end_date,
        status,
      },
      {
        onSuccess: () => {
          message.success('Progress updated')
          setProgressTarget(null)
        },
        onError: (err) => {
          message.error(err.response?.data?.message || 'Could not update progress.')
        },
      }
    )
  }

  const visibleActivities = activities.filter((activity) => {
    const phaseFilter = filteredInfo.phase
    if (phaseFilter?.length && !phaseFilter.includes(activity.phase)) return false

    const statusFilter = filteredInfo.status
    if (statusFilter?.length && !statusFilter.includes(deriveStatus(activity))) return false

    const personFilter = filteredInfo.responsible_person_id
    if (personFilter?.length && !personFilter.includes(activity.responsible_person_id)) return false

    return true
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Implementation Plan & Deliverables"
        actions={
          <>
            <ProjectPicker projects={projects} value={projectId} onChange={handleProjectChange} />
            <PlanExportButton activities={activities} />
            <PreventMutation>
              <button
                type="button"
                disabled={!projectId}
                onClick={() => setFormTarget(BLANK_ACTIVITY)}
                className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ background: '#7A0C22', height: 42, padding: '0 22px' }}
              >
                <Plus size={16} />
                Add activity
              </button>
            </PreventMutation>
          </>
        }
      />

      {isError && <Alert type="error" showIcon message={error?.message || 'Could not load activities.'} />}

      <SummaryCards activities={activities} />

      <Spin spinning={isLoading}>
        <ActivitiesTable
          activities={activities}
          visibleActivities={visibleActivities}
          filteredInfo={filteredInfo}
          onTableChange={(_pagination, filters) => setFilteredInfo(filters)}
          onEdit={setFormTarget}
          onUpdateProgress={setProgressTarget}
          onDelete={handleDelete}
          people={people}
        />
      </Spin>

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
        history={[]}
        onCancel={() => setProgressTarget(null)}
        onSave={handleSaveProgress}
      />
    </div>
  )
}