import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'pms-theme'
const ThemeContext = createContext({ isDark: false, toggleTheme: () => {} })

function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark'
  } catch {
    return false
  }
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(getStoredTheme)

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      localStorage.setItem(STORAGE_KEY, 'dark')
      return
    }

    root.classList.remove('dark')
    localStorage.setItem(STORAGE_KEY, 'light')
  }, [isDark])

  const value = useMemo(
    () => ({
      isDark,
      setIsDark,
      toggleTheme: () => setIsDark((prev) => !prev),
    }),
    [isDark],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppTheme() {
  return useContext(ThemeContext)
}
