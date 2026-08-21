import { Tooltip, Popconfirm } from 'antd'
import { Pencil, RefreshCw, Trash2, FileText, Check, X } from 'lucide-react'

function ActivityActions({
  onEdit,
  onUpdateProgress,
  onDelete,
  onDocuments,
  onApproveChange,
  onRejectChange,
  hasPendingChange,
}) {
  return (
    <div
      style={{ display: 'flex', gap: 12, alignItems: 'center' }}
      onClick={(e) => e.stopPropagation()}
    >
      <Tooltip title="Documents">
        <button type="button" onClick={onDocuments} className="cursor-pointer border-0 bg-transparent p-0 text-maroon-800 hover:opacity-70">
          <FileText size={16} />
        </button>
      </Tooltip>
      <Tooltip title="Edit activity">
        <button type="button" onClick={onEdit} className="cursor-pointer border-0 bg-transparent p-0 text-maroon-800 hover:opacity-70">
          <Pencil size={16} />
        </button>
      </Tooltip>
      <Tooltip title="Update progress">
        <button type="button" onClick={onUpdateProgress} className="cursor-pointer border-0 bg-transparent p-0 text-maroon-900 hover:opacity-70">
          <RefreshCw size={16} />
        </button>
      </Tooltip>
      {hasPendingChange && (
        <>
          <Tooltip title="Approve plan change">
            <button type="button" onClick={onApproveChange} className="cursor-pointer border-0 bg-transparent p-0 text-green-700 hover:opacity-70">
              <Check size={16} />
            </button>
          </Tooltip>
          <Tooltip title="Reject plan change">
            <button type="button" onClick={onRejectChange} className="cursor-pointer border-0 bg-transparent p-0 text-red-600 hover:opacity-70">
              <X size={16} />
            </button>
          </Tooltip>
        </>
      )}
      <Popconfirm title="Delete this activity?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={onDelete}>
        <Tooltip title="Delete activity">
          <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-red-600 hover:opacity-70">
            <Trash2 size={16} />
          </button>
        </Tooltip>
      </Popconfirm>
    </div>
  )
}

export default ActivityActions
