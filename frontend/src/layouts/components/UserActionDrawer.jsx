import { Drawer } from 'antd'
import { Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { formatUserRoles } from '../nav'

function getInitial(name) {
  if (!name) return '?'
  return name.trim().charAt(0).toUpperCase()
}

export default function UserActionDrawer({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const displayName = user?.full_name ?? user?.name ?? 'Guest'

  const handleLogout = async () => {
    await logout()
    onClose()
    navigate('/login', { replace: true })
  }

  return (
    <Drawer placement="right" width={350} onClose={onClose} open={open} title="Account and Activities">
      <div className="flex min-h-[80vh] flex-col justify-between">
        <div>
          <div className="mb-3 flex flex-col items-center justify-center border-b pb-2">
            <div className="avatar">{getInitial(displayName)}</div>
            <p className="avatar-name text-center capitalize">{displayName}</p>
            <p className="avatar-email">{user?.email ?? ''}</p>
            <p className="text-sm text-gray-500">{formatUserRoles(user)}</p>
          </div>

          <ul role="list" className="mb-4 flex flex-1 flex-col gap-y-2.5">
            <li>
              <button
                type="button"
                className="navbar-drawer-item"
                onClick={() => {
                  onClose()
                  navigate('/settings')
                }}
              >
                Settings
              </button>
            </li>
          </ul>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex w-full items-center justify-center gap-x-1.5 rounded-md bg-primary px-2.5 py-2 font-semibold text-white shadow-sm hover:bg-red-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800"
        >
          <Lock className="-ml-0.5 h-5 w-5" aria-hidden="true" />
          LogOut
        </button>
      </div>
    </Drawer>
  )
}
