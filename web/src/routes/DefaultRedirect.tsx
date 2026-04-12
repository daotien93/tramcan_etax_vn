import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function DefaultRedirect() {
  const { user } = useAuth()
  if (user?.role === 'admin') return <Navigate to="/dashboard" replace />
  return <Navigate to="/transactions" replace />
}
