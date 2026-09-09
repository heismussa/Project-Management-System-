import { Progress, Typography } from 'antd'

const { Text } = Typography

function getGaugeColor(score) {
  if (score > 75) return '#068737'
  if (score < 25) return '#962c30'
  return '#ffc20a'
}

function ProgressGauge({ overallProgress }) {
  const score = overallProgress == null
    ? 0
    : Math.round(Number(String(overallProgress).replace('%', '')) || 0)

  return (
    <div className="flex flex-col items-center gap-2">
      <Progress type="dashboard" percent={score} strokeColor={getGaugeColor(score)} />
      <Text type="secondary">Overall completion score</Text>
    </div>
  )
}

export default ProgressGauge
