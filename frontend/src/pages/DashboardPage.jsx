import { Typography } from 'antd'

const { Title, Paragraph } = Typography

function DashboardPage() {
  return (
    <div>
      <Title level={3} style={{ color: '#650018' }}>
        Dashboard
      </Title>
      <Paragraph type="secondary">Project overview and key metrics will live here.</Paragraph>
    </div>
  )
}

export default DashboardPage
