import { useState } from 'react'
import { Layout, Menu, Avatar, ConfigProvider } from 'antd'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  Network,
  FileText,
  ClipboardCheck,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  User,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const { Sider, Header, Content } = Layout

const SIDEBAR_GRADIENT = 'linear-gradient(180deg, #650018 0%, #78081E 55%, #590014 100%)'

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { path: '/projects', label: 'Projects', Icon: FolderKanban },
  { path: '/implementation-plan', label: 'Implementation Plan', Icon: ClipboardList },
  { path: '/traceability-matrix', label: 'Traceability Matrix', Icon: Network },
  { path: '/documents', label: 'Documents', Icon: FileText },
  { path: '/reviews', label: 'Reviews', Icon: ClipboardCheck },
  { path: '/settings', label: 'Settings', Icon: SettingsIcon },
]

const ROLE_LABELS = {
  project_reviewer: 'Project Reviewer',
  project_planner: 'Project Planner',
  project_coordinator: 'Project Coordinator',
  project_approver: 'Project Approver',
  project_implementor: 'Project Implementor',
  project_viewonly: 'Viewer',
}

// Matches on the longest nav path that prefixes the current URL so nested
// routes (e.g. /projects/12) still highlight their parent nav item.
function getActiveNavItem(pathname) {
  if (pathname === '/') return NAV_ITEMS[0]
  const matches = NAV_ITEMS.filter((item) => item.path !== '/' && pathname.startsWith(item.path))
  return matches.sort((a, b) => b.path.length - a.path.length)[0] ?? NAV_ITEMS[0]
}

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { user } = useAuth()

  const activeItem = getActiveNavItem(location.pathname)

  const menuItems = NAV_ITEMS.map(({ path, label, Icon }) => ({
    key: path,
    icon: <Icon size={18} strokeWidth={1.75} />,
    label: <Link to={path}>{label}</Link>,
  }))

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        className="app-sider"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={80}
        width={220}
        trigger={null}
        style={{ background: SIDEBAR_GRADIENT, backgroundImage: SIDEBAR_GRADIENT }}
      >
        <div className="app-sider-brand">{collapsed ? 'PMS' : 'Project Mgmt System'}</div>
        <ConfigProvider
          theme={{
            components: {
              Menu: {
                darkItemBg: 'transparent',
                darkItemColor: 'rgba(255,255,255,.9)',
                darkItemHoverBg: 'rgba(255,255,255,.08)',
                darkItemHoverColor: '#ffffff',
                darkItemSelectedBg: 'rgba(255,255,255,.12)',
                darkItemSelectedColor: '#ffffff',
                darkItemMarginInline: 12,
              },
            },
          }}
        >
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[activeItem.path]}
            items={menuItems}
            style={{ background: 'transparent', border: 'none' }}
          />
        </ConfigProvider>
      </Sider>

      <Layout>
        <Header className="app-header">
          <button
            type="button"
            className="app-collapse-btn"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed((prev) => !prev)}
          >
            <MenuIcon size={20} strokeWidth={1.75} />
          </button>

          <h1 className="app-header-title">{activeItem.label}</h1>

          <div className="app-header-user">
            <div className="app-header-user-text">
              <span className="app-header-user-name">{user?.full_name ?? 'Guest'}</span>
              <span className="app-header-user-role">
                {user ? (ROLE_LABELS[user.role] ?? user.role) : 'Not signed in'}
              </span>
            </div>
            <Avatar icon={<User size={18} />} style={{ backgroundColor: '#650018' }} />
          </div>
        </Header>

        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout
