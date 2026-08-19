import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Drawer } from 'antd'
import { Menu } from 'lucide-react'
import MainHeader from './components/MainHeader'
import Sidebar from './components/Sidebar'
import BreadCrumb from './components/BreadCrumb'
import { SidebarProvider, useSidebar } from './SidebarContext'
import { getBreadcrumbCrumbs } from './nav'
import './app-shell.css'

const SIDEBAR_WIDTH = 288

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 768,
  )

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return isDesktop
}

function AppLayoutShell() {
  const location = useLocation()
  const { sideBarShown } = useSidebar()
  const isDesktop = useIsDesktop()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const crumbs = getBreadcrumbCrumbs(location.pathname)
  const sidebarOpen = sideBarShown === 1 && isDesktop

  return (
    <>
      <div className={`pms-shell${sidebarOpen ? '' : ' is-collapsed'}`}>
        <MainHeader />

        {sidebarOpen ? (
          <div className="pms-sidebar" aria-label="Sidenav">
            <Sidebar />
          </div>
        ) : (
          <div className="pms-sidebar" hidden />
        )}

        <div className="pms-main">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            {!isDesktop && (
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setMobileNavOpen(true)}
                style={{
                  display: 'inline-flex',
                  height: 36,
                  width: 36,
                  flexShrink: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  borderRadius: 6,
                  backgroundColor: '#962c30',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <BreadCrumb crumbs={crumbs} />
          </div>
          <Outlet />
        </div>
      </div>

      <Drawer
        placement="left"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        closable={false}
        width={SIDEBAR_WIDTH}
        styles={{ body: { padding: 0 } }}
      >
        <div role="presentation" onClick={() => setMobileNavOpen(false)}>
          <Sidebar />
        </div>
      </Drawer>
    </>
  )
}

export default function AppLayout() {
  return (
    <SidebarProvider>
      <AppLayoutShell />
    </SidebarProvider>
  )
}
