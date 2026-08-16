import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StyleProvider } from '@ant-design/cssinjs'
import { ConfigProvider } from 'antd'
import './index.css'
import App from './App.jsx'

const theme = {
  token: {
    colorPrimary: '#962c30', // deep red / maroon
    colorSuccess: '#068737', // green accent
    colorWarning: '#ffc20a', // amber / gold
    colorInfo: '#ffc20a', // amber / gold — used for "processing" badges (e.g. Ongoing)
  },
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StyleProvider layer>
      <ConfigProvider theme={theme}>
        <App />
      </ConfigProvider>
    </StyleProvider>
  </StrictMode>,
)
