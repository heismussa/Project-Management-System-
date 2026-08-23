import { Progress, Typography } from 'antd'
import { calcScore } from '../../lib/status'
import { getRequirementStatus } from './requirementStatus'

const { Text } = Typography

function getGaugeColor(score) {
  if (score > 75) return '#068737' // brand green
  if (score < 25) return '#962c30' // brand maroon
  return '#ffc20a' // brand amber
}

function ProgressGauge({ requirements, progressUpdates, overallProgress }) {
  const scoredItems = requirements.map((requirement) => ({
    ...requirement,
    implementation_status: requirement.ui_status ?? getRequirementStatus(requirement.id, progressUpdates),
  }))
  const score =
    overallProgress != null
      ? Math.round(Number(String(overallProgress).replace('%', '')))
      : Math.round(calcScore(scoredItems))

  return (
    <div className="flex flex-col items-center gap-2">
      <Progress type="dashboard" percent={score} strokeColor={getGaugeColor(score)} />
      <Text type="secondary">Overall completion score</Text>
    </div>
  )
}

export default ProgressGauge
