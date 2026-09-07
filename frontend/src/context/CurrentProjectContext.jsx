import { createContext, useContext, useMemo, useState } from 'react'

const CurrentProjectContext = createContext({ name: '', setCurrentProjectName: () => {} })

export function CurrentProjectProvider({ children }) {
  const [name, setCurrentProjectName] = useState('')
  const value = useMemo(() => ({ name, setCurrentProjectName }), [name])
  return <CurrentProjectContext.Provider value={value}>{children}</CurrentProjectContext.Provider>
}

export function useCurrentProjectName() {
  return useContext(CurrentProjectContext)
}
