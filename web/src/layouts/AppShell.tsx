import { Button, Dropdown, Form, Input, Layout, Menu, Modal, Space, Tooltip, message, theme } from 'antd'
import {
  AuditOutlined,
  DashboardOutlined,
  FileTextOutlined,
  LockOutlined,
  LogoutOutlined,
  MoonFilled,
  MoonOutlined,
  SettingOutlined,
  SwapOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useMemo, useState } from 'react'
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
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [passwordForm] = Form.useForm<{ currentPassword: string; newPassword: string; confirmPassword: string }>()
  const [passwordLoading, setPasswordLoading] = useState(false)

  const handleChangePassword = async () => {
    try {
      setPasswordLoading(true)
      const values = await passwordForm.validateFields()

      // Demo: Check current password against hardcoded values
      const DEMO_USERS: Record<string, string> = {
        admin: 'admin123',
        user: 'user123',
      }
      const currentCorrect = DEMO_USERS[user?.username || ''] === values.currentPassword

      if (!currentCorrect) {
        message.error('Mật khẩu hiện tại không đúng')
        return
      }

      // Simulate password change
      await new Promise((resolve) => setTimeout(resolve, 500))
      message.success('Đổi mật khẩu thành công')
      setPasswordModalOpen(false)
      passwordForm.resetFields()
    } catch (err) {
      // Form validation errors are handled by Form component
    } finally {
      setPasswordLoading(false)
    }
  }

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

  const userMenuItems: MenuProps['items'] = useMemo(
    () => [
      {
        key: 'user-info',
        disabled: true,
        icon: <UserOutlined />,
        label: (
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
              {user?.username}
            </div>
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>
              {user?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
            </div>
          </div>
        ),
      },
      { type: 'divider' },
      {
        key: 'change-password',
        icon: <LockOutlined />,
        label: 'Đổi mật khẩu',
        onClick: () => setPasswordModalOpen(true),
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Đăng xuất',
        onClick: () => {
          logout()
          navigate('/login', { replace: true })
        },
      },
    ],
    [user, logout, navigate],
  )

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
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <Button type="text" icon={<UserOutlined />}>
                Admin
              </Button>
            </Dropdown>
          </Space>
        </Layout.Header>
        <Layout.Content style={{ margin: 24 }}>
          <Outlet />
        </Layout.Content>
      </Layout>

      <Modal
        title="Đổi mật khẩu"
        open={passwordModalOpen}
        onOk={handleChangePassword}
        onCancel={() => {
          setPasswordModalOpen(false)
          passwordForm.resetFields()
        }}
        okText="Cập nhật"
        cancelText="Hủy"
        confirmLoading={passwordLoading}
        width={420}
        destroyOnClose
      >
        <Form
          form={passwordForm}
          layout="vertical"
          size="large"
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="currentPassword"
            label="Mật khẩu hiện tại"
            rules={[
              { required: true, message: 'Nhập mật khẩu hiện tại' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu hiện tại" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Nhập mật khẩu mới' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('currentPassword') !== value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('Mật khẩu mới phải khác mật khẩu cũ'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu mới" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu mới"
            rules={[
              { required: true, message: 'Xác nhận mật khẩu mới' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('Xác nhận mật khẩu không khớp'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="Xác nhận mật khẩu mới" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}
