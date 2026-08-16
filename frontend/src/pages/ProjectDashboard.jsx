import { useState } from 'react'
import { Divider, Typography } from 'antd'
import ActivityTable from '../components/ActivityTable/ActivityTable'
import TraceabilityMatrix from '../components/TraceabilityMatrix/TraceabilityMatrix'
import DocumentManager from '../components/DocumentManager/DocumentManager'
import ExportReportButton from '../components/ExportReport/ExportReportButton'
import { sampleActivities } from '../data/sampleActivities'
import { sampleRequirements } from '../data/sampleRequirements'

const { Title } = Typography

function ProjectDashboard() {
  const [activities, setActivities] = useState(sampleActivities)
  const [requirements, setRequirements] = useState(sampleRequirements)

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between">
        <Title level={3} className="!mb-0">
          Project Dashboard
        </Title>
        <ExportReportButton activities={activities} requirements={requirements} />
      </div>

      <Divider />
      <ActivityTable activities={activities} onChange={setActivities} />

      <Divider />
      <TraceabilityMatrix requirements={requirements} onChange={setRequirements} />

      <Divider />
      <DocumentManager />
    </div>
  )
}

export default ProjectDashboard
