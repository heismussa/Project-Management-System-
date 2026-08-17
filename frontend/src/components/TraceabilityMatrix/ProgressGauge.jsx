{/*
  import { Progress, Typography } from 'antd'

const { Text } = Typography

function ProgressGauge({ requirements }) {
  const total = requirements.length
  const completed = requirements.filter((r) => r.status === 'Completed').length
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div className="flex flex-col items-center gap-2">
      <Progress type="dashboard" percent={percent} />
      <Text type="secondary">
        {completed} of {total} requirements completed
      </Text>
    </div>
  )
}

export default ProgressGauge
}