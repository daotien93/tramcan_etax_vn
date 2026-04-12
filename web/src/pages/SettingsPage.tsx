import { EyeOutlined, UploadOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Switch,
  Table,
  Tabs,
  Typography,
  Upload,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import type { BankAccount } from '../types/domain'
import { defaultTaxRates } from '../lib/tax'

export function SettingsPage() {
  const {
    businessProfile,
    setBusinessProfile,
    setLicenseFile,
    bankAccounts,
    addBankAccount,
    updateBankAccount,
    removeBankAccount,
    setPrimaryBank,
    taxRates,
    setTaxRates,
    bankInflowMock,
    setBankInflowMock,
  } = useAppData()

  const [profileForm] = Form.useForm<typeof businessProfile>()
  const [bankOpen, setBankOpen] = useState(false)
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null)
  const [bankForm] = Form.useForm<Pick<BankAccount, 'bankName' | 'accountNumber' | 'ownerName' | 'isPrimary'>>()
  const [previewLicense, setPreviewLicense] = useState(false)

  useEffect(() => {
    profileForm.setFieldsValue(businessProfile)
  }, [businessProfile, profileForm])

  const saveProfile = async () => {
    const v = await profileForm.validateFields()
    setBusinessProfile({ ...businessProfile, ...v })
    message.success('Đã lưu hồ sơ (local)')
  }

  const openBank = (b?: BankAccount) => {
    setEditingBank(b ?? null)
    bankForm.setFieldsValue(
      b
        ? {
            bankName: b.bankName,
            accountNumber: b.accountNumber,
            ownerName: b.ownerName,
            isPrimary: b.isPrimary,
          }
        : { bankName: '', accountNumber: '', ownerName: '', isPrimary: false },
    )
    setBankOpen(true)
  }

  const saveBank = async () => {
    const v = await bankForm.validateFields()
    if (editingBank) {
      updateBankAccount(editingBank.id, v)
      if (v.isPrimary) setPrimaryBank(editingBank.id)
    } else {
      const newId = addBankAccount({
        bankName: v.bankName,
        accountNumber: v.accountNumber,
        ownerName: v.ownerName,
      })
      if (v.isPrimary) setPrimaryBank(newId)
    }
    setBankOpen(false)
  }

  const bankColumns: ColumnsType<BankAccount> = [
    { title: 'Ngân hàng', dataIndex: 'bankName' },
    { title: 'Số TK', dataIndex: 'accountNumber' },
    { title: 'Chủ TK', dataIndex: 'ownerName' },
    {
      title: 'Chính',
      dataIndex: 'isPrimary',
      width: 90,
      render: (p: boolean) => (p ? 'Có' : ''),
    },
    {
      title: 'Thao tác',
      key: 'a',
      width: 200,
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" onClick={() => openBank(r)}>
            Sửa
          </Button>
          {!r.isPrimary && (
            <Button type="link" size="small" onClick={() => setPrimaryBank(r.id)}>
              Đặt chính
            </Button>
          )}
          <Button type="link" size="small" danger onClick={() => removeBankAccount(r.id)}>
            Xóa
          </Button>
        </Space>
      ),
    },
  ]

  const tabLegal = (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Module hồ sơ pháp lý HKD: tên, MST, CCCD, giấy phép (upload + xem trước).
      </Typography.Paragraph>
      <Form
        form={profileForm}
        layout="vertical"
        style={{ maxWidth: 560 }}
        onFinish={saveProfile}
      >
        <Form.Item name="businessName" label="Tên HKD" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="taxCode" label="Mã số thuế" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="ownerName" label="Chủ hộ" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="cccdNumber" label="Số CCCD">
          <Input />
        </Form.Item>
        <Form.Item label="Giấy phép HKD (scan)">
          <Space wrap>
            <Upload
              maxCount={1}
              showUploadList={false}
              beforeUpload={(file) => {
                setLicenseFile(file)
                message.success(`Đã chọn: ${file.name}`)
                return false
              }}
            >
              <Button icon={<UploadOutlined />}>Tải file</Button>
            </Upload>
            {businessProfile.licenseFileUrl && (
              <>
                <Button icon={<EyeOutlined />} onClick={() => setPreviewLicense(true)}>
                  Xem trước
                </Button>
                <Typography.Text type="secondary">{businessProfile.licenseFileName}</Typography.Text>
              </>
            )}
          </Space>
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Lưu hồ sơ
        </Button>
      </Form>

      <Modal
        title="Giấy phép — xem trước"
        open={previewLicense}
        onCancel={() => setPreviewLicense(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        {businessProfile.licenseFileUrl && (
          <iframe
            title="license"
            src={businessProfile.licenseFileUrl}
            style={{ width: '100%', height: '75vh', border: '1px solid #f0f0f0' }}
          />
        )}
      </Modal>
    </Space>
  )

  const tabBanks = (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <Typography.Text type="secondary">
          Tài khoản riêng của HKD; giao dịch bank gắn với một trong các TK này.
        </Typography.Text>
        <Button type="primary" onClick={() => openBank()}>
          Thêm tài khoản
        </Button>
      </Space>
      <Table<BankAccount> rowKey="id" columns={bankColumns} dataSource={bankAccounts} pagination={false} />
      <Modal
        title={editingBank ? 'Sửa tài khoản' : 'Thêm tài khoản'}
        open={bankOpen}
        onOk={saveBank}
        onCancel={() => setBankOpen(false)}
        destroyOnClose
      >
        <Form form={bankForm} layout="vertical">
          <Form.Item name="bankName" label="Ngân hàng" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="accountNumber" label="Số tài khoản" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="ownerName" label="Chủ tài khoản" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="isPrimary" label="TK chính" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )

  const tabTax = (
    <Row gutter={[24, 24]}>
      <Col xs={24} md={12}>
        <Card title="Thuế trên dòng thu (ước tính)" size="small">
          <Typography.Paragraph type="secondary">
            Tỷ lệ áp dụng khi tính GTGT + TNCN trên doanh thu theo nhóm (Dashboard). Mặc định theo spec
            ban đầu; có thể chỉnh để mô phỏng kịch bản.
          </Typography.Paragraph>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Typography.Text>Dịch vụ / cân xe — GTGT (%)</Typography.Text>
            <InputNumber
              min={0}
              max={100}
              step={0.1}
              style={{ width: '100%' }}
              value={taxRates.serviceVat * 100}
              onChange={(v) => setTaxRates({ serviceVat: (Number(v) || 0) / 100 })}
            />
            <Typography.Text>Dịch vụ — TNCN (%)</Typography.Text>
            <InputNumber
              min={0}
              max={100}
              step={0.1}
              style={{ width: '100%' }}
              value={taxRates.servicePit * 100}
              onChange={(v) => setTaxRates({ servicePit: (Number(v) || 0) / 100 })}
            />
            <Typography.Text>Bán hàng — GTGT (%)</Typography.Text>
            <InputNumber
              min={0}
              max={100}
              step={0.1}
              style={{ width: '100%' }}
              value={taxRates.tradingVat * 100}
              onChange={(v) => setTaxRates({ tradingVat: (Number(v) || 0) / 100 })}
            />
            <Typography.Text>Bán hàng — TNCN (%)</Typography.Text>
            <InputNumber
              min={0}
              max={100}
              step={0.1}
              style={{ width: '100%' }}
              value={taxRates.tradingPit * 100}
              onChange={(v) => setTaxRates({ tradingPit: (Number(v) || 0) / 100 })}
            />
            <Button
              onClick={() => {
                setTaxRates({ ...defaultTaxRates })
                message.info('Đã khôi phục mặc định')
              }}
            >
              Khôi phục mặc định
            </Button>
          </Space>
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card title="Đối soát sao kê (demo)" size="small">
          <Typography.Paragraph type="secondary">
            Nhập tổng tiền <strong>vào</strong> tài khoản ngân hàng trong kỳ (sau khi import sao kê) để kích
            hoạt rule &quot;Thu ≠ bank inflow&quot; trên trang Compliance.
          </Typography.Paragraph>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Typography.Text>Tổng vào TK (₫)</Typography.Text>
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              value={bankInflowMock ?? undefined}
              onChange={(v) => setBankInflowMock(v ?? null)}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
            <Button onClick={() => setBankInflowMock(null)}>Tắt kiểm tra (để trống)</Button>
          </Space>
        </Card>
      </Col>
    </Row>
  )

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Cài đặt
      </Typography.Title>
      <Tabs
        items={[
          { key: 'legal', label: 'Hồ sơ pháp lý', children: tabLegal },
          { key: 'banks', label: 'Tài khoản NH', children: tabBanks },
          { key: 'tax', label: 'Thuế & sao kê', children: tabTax },
        ]}
      />
    </Space>
  )
}
