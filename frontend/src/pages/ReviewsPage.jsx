import { Typography } from 'antd'

const { Title, Paragraph } = Typography

function ReviewsPage() {
  return (
    <div>
      <Title level={3} style={{ color: '#650018' }}>
        Reviews
      </Title>
      <Paragraph type="secondary">Pending and completed reviews will live here.</Paragraph>
    </div>
  )
}

export default ReviewsPage
