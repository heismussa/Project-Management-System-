import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StyleProvider } from '@ant-design/cssinjs'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './theme/ThemeProvider'
import AppProviders from './theme/AppProviders'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <StyleProvider layer>
        <AppProviders>
          <App />
        </AppProviders>
      </StyleProvider>
    </ThemeProvider>
  </StrictMode>,
)
