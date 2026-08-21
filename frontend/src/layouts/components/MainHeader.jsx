import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { Badge, Popover } from 'antd'
import { Bell, Headset, Maximize, Minimize, Moon, Sun } from 'lucide-react'
import logo from '../../assets/logo.png'
import { useAuth } from '../../context/AuthContext'
import { useAppTheme } from '../../theme/ThemeProvider'
import { SYSTEM_TITLE, getActiveNavItem } from '../nav'
import api from '../../lib/axios'
import { unwrapList } from '../../lib/apiHelpers'
import SupportDeskDrawer from './SupportDeskDrawer'
import UserActionDrawer from './UserActionDrawer'

const circleBtnClass =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/40 text-white transition-colors hover:bg-white/10'

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export default function MainHeader() {
  const location = useLocation()
  const { user } = useAuth()
  const { isDark, toggleTheme } = useAppTheme()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [userDrawerOpen, setUserDrawerOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [notifications, setNotifications] = useState([])

  const fullName = user?.full_name ?? user?.name ?? 'Guest'
  const moduleName = getActiveNavItem(location.pathname).label

  useEffect(() => {
    let cancelled = false
    const load = () => {
      api
        .get('/notifications')
        .then((response) => {
          if (!cancelled) setNotifications(unwrapList(response.data))
        })
        .catch(() => {
          if (!cancelled) setNotifications([])
        })
    }
    load()
    const timer = window.setInterval(load, 60000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  return (
    <>
      <header className="pms-header h-[100px] w-full shadow-md">
        <div className="flex flex-col">
          <div className="relative h-[60px] bg-[#902d30]">
            <div className="absolute left-4 top-0 z-50">
              <Link to="/" aria-label="NSSF home">
                <img
                  style={{
                    boxShadow: '0 1px 4px rgba(0,0,0,.3), inset 0 0 40px rgba(0,0,0,.1)',
                    height: '100px',
                  }}
                  src={logo}
                  className="mr-7"
                  alt="NSSF Logo"
                />
              </Link>
            </div>

            <div className="flex h-full items-center justify-between pl-24 pr-4 sm:pr-6">
              <h1 className="min-w-0 truncate pr-4 text-base font-bold uppercase tracking-wide text-white lg:text-xl">
                <Link to="/" className="text-white hover:text-white/90">
                  {SYSTEM_TITLE}
                </Link>
              </h1>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={toggleTheme}
                  title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                  className={circleBtnClass}
                  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>

                <button
                  type="button"
                  onClick={toggleFullScreen}
                  className={circleBtnClass}
                  title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </button>

                <Popover
                  trigger="click"
                  placement="bottomRight"
                  title="Notifications"
                  content={
                    notifications.length ? (
                      <div className="max-h-72 w-72 space-y-2 overflow-auto">
                        {notifications.map((item) => (
                          <div key={item.id} className="border-b border-gray-100 pb-2 text-sm last:border-0">
                            <div className="font-semibold text-[#650018]">{item.type}</div>
                            <div className="text-gray-600">{item.message}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="w-56 text-sm text-gray-500">No notifications yet.</div>
                    )
                  }
                >
                  <button type="button" className={circleBtnClass} title="Notifications" aria-label="Notifications">
                    <Badge count={notifications.length} size="small" color="#f9c000">
                      <Bell className="h-5 w-5 text-white" />
                    </Badge>
                  </button>
                </Popover>

                <button
                  type="button"
                  onClick={() => setUserDrawerOpen(true)}
                  className="flex items-center gap-2 rounded-full border border-white/40 py-1 pl-1 pr-3 transition-colors hover:bg-white/10 sm:gap-3 sm:pr-4"
                  aria-label="Open user menu"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f9c000] text-sm font-bold text-[#902d30]">
                    {getInitials(fullName)}
                  </span>
                  <span className="hidden max-w-[180px] truncate text-sm font-semibold text-white lg:inline xl:max-w-none">
                    {fullName}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex h-[40px] items-center justify-between bg-[#f9c000] pl-28 pr-4 sm:pr-6">
            {moduleName ? (
              <span className="truncate text-sm font-semibold capitalize text-gray-900 lg:text-base">
                {moduleName}
              </span>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={() => setSupportOpen(true)}
              className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-gray-900 hover:text-primary"
            >
              <Headset className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>Support Desk</span>
            </button>
          </div>
        </div>
      </header>

      {createPortal(
        <>
          <SupportDeskDrawer open={supportOpen} onClose={() => setSupportOpen(false)} />
          <UserActionDrawer open={userDrawerOpen} onClose={() => setUserDrawerOpen(false)} />
        </>,
        document.body,
      )}
    </>
  )
}
