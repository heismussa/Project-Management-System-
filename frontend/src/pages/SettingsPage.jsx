import { Typography } from 'antd'

const { Title, Paragraph } = Typography

function SettingsPage() {
  return (
    <div>
      <Title level={3} style={{ color: '#650018' }}>
        Settings
      </Title>
      <Paragraph type="secondary">Account and project settings will live here.</Paragraph>
    </div>
  )
}

export default SettingsPage
