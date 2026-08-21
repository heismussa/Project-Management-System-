import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Drawer } from 'antd'
import {
  Menu,
  Home,
  ClipboardList,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { path: '/home', label: 'Home', Icon: Home },
  { path: '/implementation-plan', label: 'Implementation Plan', Icon: ClipboardList },
]

const SIDEBAR_GRADIENT = 'linear-gradient(180deg, #650018 0%, #78081E 55%, #590014 100%)'

function SidebarNav({ alwaysShowLabel, onItemClick }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    if (onItemClick) onItemClick()
  }

  return (
    <div className="flex h-full flex-col justify-between pb-6">
      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ path, label, Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={onItemClick}
            className={({ isActive }) =>
              [
                'flex h-12 items-center gap-[14px] rounded-lg px-5 text-left text-sm text-white/90 transition-colors',
                isActive
                  ? 'border-l-[3px] border-amber-400 bg-white/[.12] font-semibold text-white'
                  : 'border-l-[3px] border-transparent hover:bg-white/[.08]',
              ].join(' ')
            }
          >
            <Icon size={18} strokeWidth={1.75} className="shrink-0" />
            <span className={alwaysShowLabel ? '' : 'hidden lg:inline'}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="px-3 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-12 w-full items-center gap-[14px] rounded-lg border-l-[3px] border-transparent px-5 text-left text-sm text-white/80 hover:bg-red-500/20 hover:text-white transition-colors"
        >
          <LogOut size={18} strokeWidth={1.75} className="shrink-0" />
          <span className={alwaysShowLabel ? '' : 'hidden lg:inline'}>Logout</span>
        </button>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center gap-3 border-b border-[#ECE8E4] bg-white px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="text-red-900"
        >
          <Menu size={22} />
        </button>
        <span className="font-serif text-base font-bold text-red-900">Project Management</span>
      </div>

      {/* Desktop / tablet sidebar */}
      <aside
        className="hidden shrink-0 flex-col pt-12 md:flex md:w-[72px] lg:w-[180px] min-h-screen"
        style={{ background: SIDEBAR_GRADIENT }}
      >
        <SidebarNav />
      </aside>

      {/* Mobile drawer */}
      <Drawer
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        closable={false}
        width={220}
        styles={{ body: { padding: 0, background: SIDEBAR_GRADIENT } }}
      >
        <div className="pt-8 h-full">
          <SidebarNav
            alwaysShowLabel
            onItemClick={() => setDrawerOpen(false)}
          />
        </div>
      </Drawer>
    </>
  )
}