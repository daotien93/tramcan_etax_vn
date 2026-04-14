import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AppDataProvider } from './context/AppDataContext'
import { AuthProvider } from './context/AuthContext'
import { ThemeModeProvider } from './context/ThemeModeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeModeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppDataProvider>
            <App />
          </AppDataProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeModeProvider>
  </StrictMode>,
)
