import { Tooltip, Popconfirm } from 'antd'
import { Pencil, RefreshCw, Trash2 } from 'lucide-react'

function ActivityActions({ onEdit, onUpdateProgress, onDelete }) {
  return (
    <div
      style={{ display: 'flex', gap: 14, alignItems: 'center' }}
      onClick={(e) => e.stopPropagation()}
    >
      <Tooltip title="Edit activity">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit activity"
          className="cursor-pointer border-0 bg-transparent p-0 text-maroon-800 hover:opacity-70"
        >
          <Pencil size={16} />
        </button>
      </Tooltip>
      <Tooltip title="Update progress">
        <button
          type="button"
          onClick={onUpdateProgress}
          aria-label="Update progress"
          className="cursor-pointer border-0 bg-transparent p-0 text-maroon-900 hover:opacity-70"
        >
          <RefreshCw size={16} />
        </button>
      </Tooltip>
      <Popconfirm
        title="Delete this activity?"
        okText="Delete"
        okButtonProps={{ danger: true }}
        onConfirm={onDelete}
      >
        <Tooltip title="Delete activity">
          <button
            type="button"
            aria-label="Delete activity"
            className="cursor-pointer border-0 bg-transparent p-0 text-red-600 hover:opacity-70"
          >
            <Trash2 size={16} />
          </button>
        </Tooltip>
      </Popconfirm>
    </div>
  )
}

export default ActivityActions
