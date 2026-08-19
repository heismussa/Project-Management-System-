import { ConfigProvider, theme as antTheme } from 'antd'
import { useAppTheme } from './ThemeProvider'

export default function AppProviders({ children }) {
  const { isDark } = useAppTheme()

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#962c30',
          colorPrimaryHover: '#962E32',
          colorPrimaryActive: '#962E32',
          colorSuccess: '#068737',
          colorWarning: '#ffc20a',
          colorInfo: '#ffc20a',
        },
        components: {
          Button: {
            defaultHoverBorderColor: '#962E32',
            defaultHoverColor: '#962E32',
            colorPrimaryHover: '#962E31',
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  )
}
