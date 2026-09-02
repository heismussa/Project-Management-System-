import { Button, Space } from 'antd'

function ActivityActions({ onReview, onEdit, editDisabled = false, onView }) {
  if (onView) {
    return (
      <div onClick={(event) => event.stopPropagation()}>
        <Button
          type="primary"
          onClick={onView}
          style={{ backgroundColor: '#800000', borderColor: '#800000', width: 110 }}
        >
          View
        </Button>
      </div>
    )
  }

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <Space size="small" wrap>
        {onEdit && (
          <Button size="small" disabled={editDisabled} onClick={onEdit}>
            Edit
          </Button>
        )}
        <Button
          type="primary"
          onClick={onReview}
          style={{ backgroundColor: '#800000', borderColor: '#800000', width: 110 }}
        >
          Review
        </Button>
      </Space>
    </div>
  )
}

export default ActivityActions
