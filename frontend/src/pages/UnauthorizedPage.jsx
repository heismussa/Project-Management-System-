import { Result, Button } from 'antd'
import { Link } from 'react-router-dom'

function UnauthorizedPage() {
  return (
    <Result
      status="403"
      title="403"
      subTitle="Your role doesn't have access to this page."
      extra={
        <Link to="/">
          <Button type="primary" style={{ backgroundColor: '#650018' }}>
            Back to Dashboard
          </Button>
        </Link>
      }
    />
  )
}

export default UnauthorizedPage
