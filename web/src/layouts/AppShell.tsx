import { Button, Layout, Menu, Space, Tag, Tooltip, theme } from 'antd'
import {
  AuditOutlined,
  DashboardOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MoonFilled,
  MoonOutlined,
  SettingOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import { useMemo } from 'react'
import type { MenuProps } from 'antd'
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useThemeMode } from '../context/ThemeModeContext'

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = theme.useToken()
  const { user, logout } = useAuth()
  const { mode, toggleMode } = useThemeMode()

  const menuItems: MenuProps['items'] = useMemo(() => {
    const rest: MenuProps['items'] = [
      { key: '/transactions', icon: <SwapOutlined />, label: 'Giao dịch' },
      { key: '/documents', icon: <FileTextOutlined />, label: 'Chứng từ' },
      { key: '/compliance', icon: <AuditOutlined />, label: 'Compliance' },
      { key: '/settings', icon: <SettingOutlined />, label: 'Cài đặt' },
    ]
    if (user?.role === 'admin') {
      return [
        { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
        ...rest,
      ]
    }
    return rest
  }, [user?.role])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Sider
        breakpoint="lg"
        collapsedWidth={64}
        style={{ background: token.colorBgContainer, borderRight: `1px solid ${token.colorBorderSecondary}` }}
      >
        <Link to="/dashboard" style={{ textDecoration: 'none' }}>
          <div
            style={{
              height: 48,
              margin: 16,
              color: token.colorText,
              fontWeight: 600,
              fontSize: 14,
              lineHeight: '48px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.7'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            TramCan & Tax Viet
          </div>
        </Link>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: token.colorBgContainer, borderRight: 'none' }}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header
          style={{
            padding: '0 24px',
            background: token.colorBgContainer,
            lineHeight: '64px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>HKD — Thuế & chứng từ</span>
          <Space size="middle">
            <Tooltip title={mode === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}>
              <Button
                type="text"
                icon={mode === 'dark' ? <MoonFilled /> : <MoonOutlined />}
                onClick={toggleMode}
              />
            </Tooltip>
            <Tag color={user?.role === 'admin' ? 'gold' : 'blue'}>
              {user?.username} · {user?.role === 'admin' ? 'Admin' : 'User'}
            </Tag>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
            >
              Đăng xuất
            </Button>
          </Space>
        </Layout.Header>
        <Layout.Content style={{ margin: 24 }}>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
