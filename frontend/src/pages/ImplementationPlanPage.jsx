import { useCallback, useEffect, useState } from 'react'
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
import api from '../lib/axios'
import {
  getStoredProjectId,
  storeProjectId,
  unwrapItem,
  unwrapList,
} from '../lib/apiHelpers'

const BLANK_ACTIVITY = {
  id: null,
  name: '',
  expected_deliverable: '',
  planned_start_date: null,
  planned_end_date: null,
  responsible_person_id: null,
}

function ImplementationPlanPage() {
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [projectId, setProjectId] = useState(getStoredProjectId)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formTarget, setFormTarget] = useState(null)
  const [progressTarget, setProgressTarget] = useState(null)
  const [filteredInfo, setFilteredInfo] = useState({})

  const people = users.map((user) => ({
    id: user.id,
    name: user.name,
    role: user.email,
  }))

  const loadProjectsAndUsers = useCallback(async () => {
    try {
      const [projectsRes, usersRes] = await Promise.all([
        api.get('/projects'),
        api.get('/users'),
      ])
      const projectList = unwrapList(projectsRes.data)
      setProjects(projectList)
      setUsers(unwrapList(usersRes.data))
      setProjectId((current) => {
        if (current && projectList.some((project) => project.id === current)) return current
        const first = projectList[0]?.id ?? null
        storeProjectId(first)
        return first
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load projects.')
    }
  }, [])

  const loadActivities = useCallback(async (id) => {
    if (!id) {
      setActivities([])
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await api.get(`/projects/${id}/activities`)
      setActivities(unwrapList(response.data))
    } catch (err) {
      setActivities([])
      setError(err.response?.data?.message || 'Could not load activities.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjectsAndUsers()
  }, [loadProjectsAndUsers])

  useEffect(() => {
    loadActivities(projectId)
  }, [projectId, loadActivities])

  const handleProjectChange = (id) => {
    storeProjectId(id)
    setProjectId(id)
  }

  const handleSaveForm = async (values) => {
    try {
      if (formTarget.id == null) {
        const response = await api.post('/activities', { ...values, project_id: projectId })
        const created = unwrapItem(response.data)
        setActivities((prev) => [...prev, created])
        message.success('Activity added')
      } else {
        const response = await api.put(`/activities/${formTarget.id}`, values)
        const updated = unwrapItem(response.data)
        setActivities((prev) => prev.map((activity) => (activity.id === updated.id ? updated : activity)))
        message.success('Activity updated')
      }
      setFormTarget(null)
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not save activity.')
    }
  }

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete this activity?',
      content: 'This cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        await api.delete(`/activities/${id}`)
        setActivities((prev) => prev.filter((activity) => activity.id !== id))
        message.success('Activity deleted')
      },
    })
  }

  const handleSaveProgress = async ({ actual_start_date, actual_end_date }) => {
    try {
      const status = deriveStatus({ actual_start_date, actual_end_date })
      const response = await api.put(`/activities/${progressTarget.id}`, {
        actual_start_date,
        actual_end_date,
        status,
      })
      const updated = unwrapItem(response.data)
      setActivities((prev) => prev.map((activity) => (activity.id === updated.id ? updated : activity)))
      setProgressTarget(null)
      message.success('Progress updated')
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not update progress.')
    }
  }

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
            <ProjectPicker projects={projects} value={projectId} onChange={handleProjectChange} />
            <PlanExportButton activities={activities} />
            <button
              type="button"
              disabled={!projectId}
              onClick={() => setFormTarget(BLANK_ACTIVITY)}
              className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
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

      {error && <Alert type="error" showIcon message={error} />}

      <SummaryCards activities={activities} />

      <Spin spinning={loading}>
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

export default ImplementationPlanPage
