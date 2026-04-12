import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type UserRole = 'admin' | 'user'

export interface AuthUser {
  username: string
  role: UserRole
}

type AuthCtx = {
  user: AuthUser | null
  /** Đăng nhập thành công trả về user, sai trả về null */
  login: (username: string, password: string) => AuthUser | null
  logout: () => void
}

const STORAGE_KEY = 'tramcan_auth_v1'

/** Demo — thay bằng API JWT khi backend sẵn sàng */
const DEMO: Record<string, { password: string; role: UserRole }> = {
  admin: { password: 'admin123', role: 'admin' },
  user: { password: 'user123', role: 'user' },
}

function loadStored(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as AuthUser
    if (p?.username && (p.role === 'admin' || p.role === 'user')) return p
  } catch {
    /* ignore */
  }
  return null
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadStored())

  const login = useCallback((username: string, password: string): AuthUser | null => {
    const u = username.trim().toLowerCase()
    const row = DEMO[u]
    if (!row || row.password !== password) return null
    const next: AuthUser = { username: u, role: row.role }
    setUser(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return next
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const c = useContext(AuthContext)
  if (!c) throw new Error('useAuth must be used within AuthProvider')
  return c
}
