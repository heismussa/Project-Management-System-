import { Button, Popover, Space } from 'antd'
import {
  CalendarOutlined,
  CloudUploadOutlined,
  MoreOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons'

function ActivityActions({
  isPlanner = false,
  actionsOpen = false,
  onActionsOpenChange,
  canSaveDocument = false,
  onReview,
  onUploadDocument,
  onSaveDocument,
  onSubmitPlan,
  onUpdateDates,
}) {
  const stopRowClick = (event) => event.stopPropagation()

  if (isPlanner) {
    return (
      <div onClick={stopRowClick}>
        <Popover
          trigger="click"
          placement="bottomRight"
          arrow={{ pointAtCenter: true }}
          open={actionsOpen}
          onOpenChange={onActionsOpenChange}
          content={
            <div className="w-[200px]">
              <Space direction="vertical" size={4} className="w-full">
                <Button
                  type="text"
                  block
                  className="!justify-start"
                  icon={<CloudUploadOutlined />}
                  onClick={onUploadDocument}
                >
                  Upload Document
                </Button>
                <Button
                  type="text"
                  block
                  className="!justify-start"
                  icon={<SaveOutlined />}
                  disabled={!canSaveDocument}
                  onClick={onSaveDocument}
                >
                  Save Document
                </Button>
                <Button
                  type="text"
                  block
                  className="!justify-start"
                  icon={<SendOutlined />}
                  onClick={onSubmitPlan}
                >
                  Submit Plan
                </Button>
                <Button
                  type="text"
                  block
                  className="!justify-start"
                  icon={<CalendarOutlined />}
                  onClick={onUpdateDates}
                >
                  Update Dates
                </Button>
              </Space>
            </div>
          }
        >
          <Button type="text" icon={<MoreOutlined style={{ fontSize: 18 }} />} aria-label="Activity actions" />
        </Popover>
      </div>
    )
  }

  return (
    <div onClick={stopRowClick}>
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
