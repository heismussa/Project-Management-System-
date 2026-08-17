import { useState } from 'react'
import { Drawer } from 'antd'
import {
  Menu,
  ClipboardList,
  Calendar,
  CalendarCheck,
  PlayCircle,
  StopCircle,
  User,
  Briefcase,
  Activity as ActivityIcon,
  MoreHorizontal,
} from 'lucide-react'

const NAV_ITEMS = [
  { key: 'activity', label: 'Activity', Icon: ClipboardList },
  { key: 'planned_start', label: 'Planned Start', Icon: Calendar },
  { key: 'planned_end', label: 'Planned End', Icon: CalendarCheck },
  { key: 'actual_start', label: 'Actual Start', Icon: PlayCircle },
  { key: 'actual_end', label: 'Actual End', Icon: StopCircle },
  { key: 'responsible', label: 'Responsible', Icon: User },
  { key: 'assigned_role', label: 'Assigned Role', Icon: Briefcase },
  { key: 'status', label: 'Status', Icon: ActivityIcon },
  { key: 'actions', label: 'Actions', Icon: MoreHorizontal },
]

const SIDEBAR_GRADIENT = 'linear-gradient(180deg, #650018 0%, #78081E 55%, #590014 100%)'

function SidebarNav({ active, onSelect, alwaysShowLabel }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.map(({ key, label, Icon }) => {
        const isActive = active === key
        return (
          <button
            key={key}
            type="button"
            title={label}
            onClick={() => onSelect(key)}
            className={[
              'flex h-12 items-center gap-[14px] rounded-lg px-5 text-left text-sm text-white/90 transition-colors',
              isActive
                ? 'border-l-[3px] border-gold-500 bg-white/[.12]'
                : 'border-l-[3px] border-transparent hover:bg-white/[.08]',
            ].join(' ')}
          >
            <Icon size={18} strokeWidth={1.75} className="shrink-0" />
            <span className={alwaysShowLabel ? '' : 'hidden lg:inline'}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function Sidebar() {
  const [active, setActive] = useState('activity')
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center gap-3 border-b border-[#ECE8E4] bg-white px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="text-maroon-900"
        >
          <Menu size={22} />
        </button>
        <span className="font-serif text-base font-bold text-maroon-900">Implementation Plan</span>
      </div>

      {/* Desktop / tablet sidebar */}
      <aside
        className="hidden shrink-0 flex-col pt-12 md:flex md:w-[72px] lg:w-[180px]"
        style={{ background: SIDEBAR_GRADIENT }}
      >
        <SidebarNav active={active} onSelect={setActive} />
      </aside>

      {/* Mobile drawer */}
      <Drawer
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        closable={false}
        size={220}
        styles={{ body: { padding: 0, background: SIDEBAR_GRADIENT } }}
      >
        <div className="pt-8">
          <SidebarNav
            active={active}
            onSelect={(key) => {
              setActive(key)
              setDrawerOpen(false)
            }}
            alwaysShowLabel
          />
        </div>
      </Drawer>
    </>
  )
}

export default Sidebar
