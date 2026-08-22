import { Button } from 'antd'

function ActivityActions({ onReview }) {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Button
        onClick={onReview}
        style={{
          background: '#962C30',
          borderColor: '#962C30',
          color: '#ffffff',
          borderRadius: 6,
          width: 96,
          fontWeight: 500,
        }}
      >
        Review
      </Button>
    </div>
  )
}

export default ActivityActions
