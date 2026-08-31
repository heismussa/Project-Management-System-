import { Button } from 'antd'

function ActivityActions({ onReview }) {
  return (
    <div onClick={(event) => event.stopPropagation()}>
      <Button
        type="primary"
        onClick={onReview}
        style={{ backgroundColor: '#800000', borderColor: '#800000', width: 110 }}
      >
        Review
      </Button>
    </div>
  )
}

export default ActivityActions
