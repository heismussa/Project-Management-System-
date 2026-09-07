import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const STORAGE_KEY = 'showSideBar'
const SidebarContext = createContext({
  sideBarShown: 1,
  toggleSideBar: () => {},
})

function readShown() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw === null) return 1
    return JSON.parse(raw) === 0 ? 0 : 1
  } catch {
    return 1
  }
}

export function SidebarProvider({ children }) {
  const [sideBarShown, setSideBarShown] = useState(readShown)

  const toggleSideBar = useCallback(() => {
    setSideBarShown((prev) => {
      const next = prev === 1 ? 0 : 1
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ sideBarShown, toggleSideBar }),
    [sideBarShown, toggleSideBar],
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSidebar() {
  return useContext(SidebarContext)
}
