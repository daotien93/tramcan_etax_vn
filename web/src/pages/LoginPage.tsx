import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { App, Button, Card, Form, Input, Typography } from 'antd'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type Fields = { username: string; password: string }

export function LoginPage() {
  const { message } = App.useApp()
  const { login, user } = useAuth()
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

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #f0f5ff 0%, #fff 45%, #e6f4ff 100%)',
        padding: 24,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 400 }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginTop: 0 }}>
          TramCan Nga Tron
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 24 }}>
          Đăng nhập để tiếp tục
        </Typography.Paragraph>

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
            label="Tên đăng nhập"
            rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="admin hoặc user" autoComplete="username" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, message: 'Nhập mật khẩu' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 8 }}>
            <Button type="primary" htmlType="submit" block size="large">
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
