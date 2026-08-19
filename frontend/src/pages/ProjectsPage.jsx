import { Typography } from 'antd'

const { Title, Paragraph } = Typography

function ProjectsPage() {
  return (
    <div>
      <Title level={3} style={{ color: '#650018' }}>
        Projects
      </Title>
      <Paragraph type="secondary">A list of all projects will live here.</Paragraph>
    </div>
  )
}

export default ProjectsPage
