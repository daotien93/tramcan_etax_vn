import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import viVN from 'antd/locale/vi_VN'
import './index.css'
import App from './App.tsx'
import { AppDataProvider } from './context/AppDataContext'
import { AuthProvider } from './context/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={viVN}>
      <AntApp>
        <BrowserRouter>
          <AuthProvider>
            <AppDataProvider>
              <App />
            </AppDataProvider>
          </AuthProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
)
