import {
  CheckCircleOutlined,
  LockOutlined,
  MoonFilled,
  MoonOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { App, Button, Card, Form, Input, theme, Tooltip, Typography } from 'antd'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { useAuth } from '../context/AuthContext'
import { useThemeMode } from '../context/ThemeModeContext'

type Fields = { username: string; password: string }

export function LoginPage() {
  const { message } = App.useApp()
  const { login, user } = useAuth()
  const { token } = theme.useToken()
  const { mode, toggleMode } = useThemeMode()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { from?: string } | null
  const from =
    state?.from && state.from !== '/login' && state.from !== '/' ? state.from : null

  if (user) {
    const fallback = user.role === 'admin' ? '/dashboard' : '/transactions'
    const raw = from ?? fallback
    const target =
      raw === '/dashboard' && user.role !== 'admin' ? '/transactions' : raw
    return <Navigate to={target} replace />
  }

  const containerStyle: CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    background: token.colorBgLayout,
    position: 'relative',
  }

  const leftColumnStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60px 48px',
    background: 'linear-gradient(135deg, #1890ff 0%, #0050b3 100%)',
    color: '#fff',
    minWidth: '50%',
    position: 'relative',
    zIndex: 1,
  }

  const waveStyle: CSSProperties = {
    position: 'absolute',
    right: -1,
    top: 0,
    height: '100%',
    width: 100,
    fill: token.colorBgContainer,
  }

  const illustrationStyle: CSSProperties = {
    width: 280,
    height: 280,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    fontSize: 120,
    position: 'relative',
    zIndex: 2,
  }

  const featureListStyle: CSSProperties = {
    width: '100%',
    maxWidth: 320,
    marginTop: 40,
    position: 'relative',
    zIndex: 2,
  }

  const rightColumnStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 48px',
    background: token.colorBgContainer,
    minWidth: '50%',
  }

  const formCardStyle: CSSProperties = {
    width: '100%',
    maxWidth: 420,
    border: 'none',
    background: token.colorBgContainer,
    boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08)',
    borderRadius: token.borderRadiusLG,
  }

  const themeButtonStyle: CSSProperties = {
    position: 'absolute',
    top: 24,
    right: 24,
  }

  return (
    <div style={containerStyle}>
      <Tooltip title={mode === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}>
        <Button
          type="text"
          icon={mode === 'dark' ? <MoonFilled /> : <MoonOutlined />}
          onClick={toggleMode}
          style={themeButtonStyle}
          size="large"
        />
      </Tooltip>

      {/* Left Column */}
      <div style={leftColumnStyle}>
        {/* Wave Separator */}
        <svg
          viewBox="0 0 100 1000"
          preserveAspectRatio="none"
          style={waveStyle}
        >
          <path
            d="M0,300 Q25,200 50,300 T100,300 L100,1000 L0,1000 Z"
            fill="currentColor"
          />
        </svg>

        <div style={illustrationStyle}>
          <span>💰</span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 40, position: 'relative', zIndex: 2 }}>
          <Typography.Title level={2} style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 28 }}>
            TramCan & Tax
          </Typography.Title>
          <Typography.Paragraph style={{ color: 'rgba(255, 255, 255, 0.9)', marginTop: 12, fontSize: 16 }}>
            Quản lý tài chính thông minh
          </Typography.Paragraph>
        </div>

        <div style={featureListStyle}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
            <CheckCircleOutlined style={{ fontSize: 18, color: '#fff', flexShrink: 0 }} />
            <div>
              <Typography.Text style={{ color: '#fff', display: 'block', fontWeight: 500, marginBottom: 4 }}>
                Giao dịch rõ ràng
              </Typography.Text>
              <Typography.Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 13 }}>
                Quản lý đầy đủ
              </Typography.Text>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
            <CheckCircleOutlined style={{ fontSize: 18, color: '#fff', flexShrink: 0 }} />
            <div>
              <Typography.Text style={{ color: '#fff', display: 'block', fontWeight: 500, marginBottom: 4 }}>
                Tính thuế tự động
              </Typography.Text>
              <Typography.Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 13 }}>
                Nhanh & chính xác
              </Typography.Text>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <CheckCircleOutlined style={{ fontSize: 18, color: '#fff', flexShrink: 0 }} />
            <div>
              <Typography.Text style={{ color: '#fff', display: 'block', fontWeight: 500, marginBottom: 4 }}>
                Tuân thủ thuế
              </Typography.Text>
              <Typography.Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 13 }}>
                Cảnh báo & báo cáo
              </Typography.Text>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div style={rightColumnStyle}>
        <Card style={formCardStyle} bodyStyle={{ padding: 40 }}>
          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            <Typography.Title level={2} style={{ margin: '0 0 8px 0', fontWeight: 700, fontSize: 28 }}>
              Đăng nhập
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ margin: 0, fontSize: 14 }}>
              Truy cập tài khoản của bạn
            </Typography.Paragraph>
          </div>

          <Form<Fields>
            layout="vertical"
            requiredMark={false}
            onFinish={(v) => {
              const next = login(v.username.trim(), v.password)
              if (!next) {
                message.error('Sai tên đăng nhập hoặc mật khẩu')
                return
              }
              const home = next.role === 'admin' ? '/dashboard' : '/transactions'
              let target = from ?? home
              if (target === '/dashboard' && next.role !== 'admin') target = '/transactions'
              navigate(target, { replace: true })
            }}
          >
            <Form.Item
              name="username"
              label={<Typography.Text strong>Tên đăng nhập</Typography.Text>}
              rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: token.colorTextSecondary }} />}
                placeholder="admin hoặc user"
                autoComplete="username"
                size="large"
                style={{ borderRadius: token.borderRadiusSM, fontSize: 14, height: 42 }}
                bordered
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<Typography.Text strong>Mật khẩu</Typography.Text>}
              rules={[{ required: true, message: 'Nhập mật khẩu' }]}
              style={{ marginBottom: 24 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: token.colorTextSecondary }} />}
                placeholder="••••••••"
                autoComplete="current-password"
                size="large"
                style={{ borderRadius: token.borderRadiusSM, fontSize: 14, height: 42 }}
                bordered
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                style={{
                  height: 44,
                  fontSize: 16,
                  fontWeight: 600,
                  borderRadius: token.borderRadiusSM,
                }}
              >
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', paddingTop: 20, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 4 }}>
              <strong>Tài khoản demo:</strong>
            </Typography.Paragraph>
            <Typography.Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
              👤 <strong>admin</strong> / <strong>user</strong>
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
              🔐 <strong>123456</strong>
            </Typography.Text>
          </div>
        </Card>
      </div>
    </div>
  )
}
