import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { CompliancePage } from './pages/CompliancePage'
import { SettingsPage } from './pages/SettingsPage'
import { LoginPage } from './pages/LoginPage'
import { RequireAuth } from './routes/RequireAuth'
import { AdminOnly } from './routes/AdminOnly'
import { DefaultRedirect } from './routes/DefaultRedirect'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DefaultRedirect />} />
          <Route
            path="dashboard"
            element={
              <AdminOnly>
                <DashboardPage />
              </AdminOnly>
            }
          />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
