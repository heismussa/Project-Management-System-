import { ConfigProvider, theme as antTheme } from 'antd'
import { useAppTheme } from './ThemeProvider'

export const PMS_DARK_BG_CONTAINER = '#17212b'
export const PMS_DARK_BG_LAYOUT = '#111827'
export const PMS_DARK_BORDER = '#2a3947'
export const PMS_DARK_ROW_HOVER = '#1e2d3a'

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
          ...(isDark
            ? {
                colorBgContainer: PMS_DARK_BG_CONTAINER,
                colorBgElevated: PMS_DARK_BG_CONTAINER,
                colorBgLayout: PMS_DARK_BG_LAYOUT,
                colorBorderSecondary: PMS_DARK_BORDER,
              }
            : {}),
        },
        components: {
          Button: {
            defaultHoverBorderColor: '#962E32',
            defaultHoverColor: '#962E32',
            colorPrimaryHover: '#962E31',
          },
          Card: {
            ...(isDark ? { colorBgContainer: PMS_DARK_BG_CONTAINER } : {}),
          },
          Table: {
            headerBg: '#962c30',
            headerColor: '#ffffff',
            headerSplitColor: 'rgba(255,255,255,.55)',
            cellPaddingInline: 12,
            fontSize: 15,
            ...(isDark
              ? {
                  colorBgContainer: PMS_DARK_BG_CONTAINER,
                  rowHoverBg: PMS_DARK_ROW_HOVER,
                  borderColor: PMS_DARK_BORDER,
                }
              : {
                  rowHoverBg: '#fafafa',
                  borderColor: 'rgba(0, 0, 0, 0.04)',
                }),
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  )
}
