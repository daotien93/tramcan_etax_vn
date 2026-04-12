import { PrinterOutlined, WarningOutlined } from '@ant-design/icons'
import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import type { PaymentMethod, Transaction, TransactionCategory, TransactionType } from '../types/domain'
import { formatDate, formatVnd } from '../lib/format'
import { isHighValueWithoutContract } from '../lib/compliance'
import {
  buildTransactionPrintHtml,
  filterTransactionsForPrint,
  navigateWindowToPrintHtml,
  PRINT_LARGE_AMOUNT_THRESHOLD,
  type TransactionPrintFilters,
} from '../lib/transactionPrint'

type FormValues = {
  type: TransactionType
  category: TransactionCategory
  amount: number
  paymentMethod: PaymentMethod
  bankAccountId?: string
  customerName: string
  description: string
  transactionDate: dayjs.Dayjs
}

const initialForm = (): Partial<FormValues> => ({
  type: 'income',
  category: 'service',
  paymentMethod: 'bank',
  transactionDate: dayjs(),
})

export function TransactionsPage() {
  const {
    transactions,
    documents,
    invoices,
    bankAccounts,
    upsertTransaction,
    removeTransaction,
    upsertInvoice,
  } = useAppData()
  const [params] = useSearchParams()
  const highlightId = params.get('highlight')

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [invoiceTxId, setInvoiceTxId] = useState<string | null>(null)
  const [form] = Form.useForm<FormValues>()
  const [invForm] = Form.useForm<{ invoiceNumber: string; issuedDate: dayjs.Dayjs; status: 'draft' | 'issued' | 'cancelled' }>()
  const [printOpen, setPrintOpen] = useState(false)
  const [printForm] = Form.useForm<TransactionPrintFilters>()

  useEffect(() => {
    if (!highlightId) return
    const el = document.querySelector(`[data-row-key="${highlightId}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightId, transactions])

  const bankLabel = useMemo(() => {
    const m = new Map(bankAccounts.map((b) => [b.id, `${b.bankName} · ${b.accountNumber}`]))
    return m
  }, [bankAccounts])

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue(initialForm() as FormValues)
    setOpen(true)
  }

  const openEdit = (row: Transaction) => {
    setEditing(row)
    form.setFieldsValue({
      ...row,
      transactionDate: dayjs(row.transactionDate),
      bankAccountId: row.bankAccountId ?? undefined,
    })
    setOpen(true)
  }

  const submit = async () => {
    const v = await form.validateFields()
    upsertTransaction({
      id: editing?.id,
      type: v.type,
      category: v.category,
      amount: v.amount,
      paymentMethod: v.paymentMethod,
      bankAccountId: v.paymentMethod === 'bank' ? v.bankAccountId ?? null : null,
      customerName: v.customerName ?? '',
      description: v.description ?? '',
      transactionDate: v.transactionDate.format('YYYY-MM-DD'),
    })
    setOpen(false)
  }

  const openInvoiceModal = (transactionId: string) => {
    setInvoiceTxId(transactionId)
    const existing = invoices.find((i) => i.transactionId === transactionId)
    invForm.setFieldsValue({
      invoiceNumber: existing?.invoiceNumber ?? '',
      issuedDate: existing?.issuedDate ? dayjs(existing.issuedDate) : dayjs(),
      status: existing?.status ?? 'draft',
    })
    setInvoiceOpen(true)
  }

  const openPrintModal = () => {
    printForm.setFieldsValue({
      flow: 'all',
      period: 'all',
      largeAmountOnly: false,
    })
    setPrintOpen(true)
  }

  /** Mở tab trắng ngay trong click (đồng bộ) — nếu await validate trước, trình duyệt chặn popup / about:blank không ghi được. */
  const submitPrint = (): Promise<void> => {
    const w = window.open('about:blank', '_blank')
    if (!w) {
      message.error('Trình duyệt đã chặn cửa sổ in — cho phép popup cho site này')
      return Promise.reject(new Error('popup_blocked'))
    }
    return printForm
      .validateFields()
      .then((f) => {
        const rows = filterTransactionsForPrint(transactions, f)
        if (rows.length === 0) {
          w.close()
          message.warning('Không có giao dịch nào thỏa điều kiện đã chọn')
          return Promise.reject(new Error('no_rows'))
        }
        const html = buildTransactionPrintHtml(rows, f, bankLabel)
        navigateWindowToPrintHtml(w, html)
        setPrintOpen(false)
        message.success(`Đang mở bản in (${rows.length} dòng)`)
      })
      .catch((err: unknown) => {
        if (err && typeof err === 'object' && 'errorFields' in err) {
          try {
            w.close()
          } catch {
            /* ignore */
          }
        } else if (
          err instanceof Error &&
          err.message !== 'no_rows' &&
          err.message !== 'popup_blocked'
        ) {
          try {
            w.close()
          } catch {
            /* ignore */
          }
        }
        return Promise.reject(err)
      })
  }

  const submitInvoice = async () => {
    if (!invoiceTxId) return
    const v = await invForm.validateFields()
    const existing = invoices.find((i) => i.transactionId === invoiceTxId)
    upsertInvoice({
      id: existing?.id,
      transactionId: invoiceTxId,
      invoiceNumber: v.invoiceNumber,
      issuedDate: v.issuedDate ? v.issuedDate.format('YYYY-MM-DD') : null,
      status: v.status,
    })
    setInvoiceOpen(false)
    setInvoiceTxId(null)
  }

  const columns: ColumnsType<Transaction> = [
    {
      title: 'Ngày',
      dataIndex: 'transactionDate',
      width: 110,
      render: (d: string) => formatDate(d),
      sorter: (a, b) => a.transactionDate.localeCompare(b.transactionDate),
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      width: 88,
      filters: [
        { text: 'Thu', value: 'income' },
        { text: 'Chi', value: 'expense' },
      ],
      onFilter: (value, record) => record.type === value,
      render: (t: TransactionType) => (
        <Tag color={t === 'income' ? 'green' : 'volcano'}>{t === 'income' ? 'Thu' : 'Chi'}</Tag>
      ),
    },
    {
      title: 'Nhóm',
      dataIndex: 'category',
      width: 110,
      render: (c: TransactionCategory) => {
        const map = { service: 'Cân xe / DV', trading: 'Bán hàng', other: 'Khác' }
        return map[c]
      },
      filters: [
        { text: 'Dịch vụ', value: 'service' },
        { text: 'Bán hàng', value: 'trading' },
        { text: 'Khác', value: 'other' },
      ],
      onFilter: (value, record) => record.category === value,
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      width: 140,
      align: 'right',
      render: (a: number) => formatVnd(a),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Thanh toán',
      width: 96,
      render: (_, r) => (r.paymentMethod === 'bank' ? 'Ngân hàng' : 'Tiền mặt'),
    },
    {
      title: 'Tài khoản',
      width: 180,
      ellipsis: true,
      render: (_, r) =>
        r.bankAccountId ? bankLabel.get(r.bankAccountId) ?? '—' : '—',
    },
    {
      title: 'Đối tác / KH',
      dataIndex: 'customerName',
      ellipsis: true,
      width: 160,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: 'Cảnh báo',
      width: 120,
      render: (_, r) =>
        isHighValueWithoutContract(r, documents) ? (
          <Tooltip title="Thu &gt; 20.000.000 ₫ nhưng chưa có hợp đồng đính kèm">
            <Tag color="error" icon={<WarningOutlined />}>
              20tr+
            </Tag>
          </Tooltip>
        ) : (
          '—'
        ),
    },
    {
      title: 'HĐ ĐT',
      width: 100,
      render: (_, r) => {
        const inv = invoices.find((i) => i.transactionId === r.id)
        if (!inv) return <Tag>Chưa có</Tag>
        return (
          <Tag color={inv.status === 'issued' ? 'blue' : 'default'}>
            {inv.invoiceNumber}
          </Tag>
        )
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_, r) => (
        <Space size="small" wrap>
          <Button type="link" size="small" onClick={() => openEdit(r)}>
            Sửa
          </Button>
          <Button type="link" size="small" onClick={() => openInvoiceModal(r.id)}>
            Hóa đơn
          </Button>
          <Button type="link" size="small" danger onClick={() => removeTransaction(r.id)}>
            Xóa
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }} wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Giao dịch
        </Typography.Title>
        <Space wrap>
          <Button icon={<PrinterOutlined />} onClick={openPrintModal}>
            In danh sách
          </Button>
          <Button type="primary" onClick={openCreate}>
            Thêm giao dịch
          </Button>
        </Space>
      </Space>

      <Table<Transaction>
        rowKey="id"
        columns={columns}
        dataSource={transactions}
        scroll={{ x: 1200 }}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        rowClassName={(r) => (r.id === highlightId ? 'row-highlight' : '')}
      />

      <Modal
        title={editing ? 'Sửa giao dịch' : 'Thêm giao dịch'}
        open={open}
        onOk={submit}
        onCancel={() => setOpen(false)}
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical" initialValues={initialForm()}>
          <Form.Item name="type" label="Loại" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'income', label: 'Thu' },
                { value: 'expense', label: 'Chi' },
              ]}
            />
          </Form.Item>
          <Form.Item name="category" label="Phân loại" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'service', label: 'Cân xe / dịch vụ' },
                { value: 'trading', label: 'Bán hàng' },
                { value: 'other', label: 'Khác' },
              ]}
            />
          </Form.Item>
          <Form.Item name="amount" label="Số tiền (₫)" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item name="paymentMethod" label="Hình thức" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'bank', label: 'Ngân hàng' },
                { value: 'cash', label: 'Tiền mặt' },
              ]}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(p, c) => p.paymentMethod !== c.paymentMethod}
          >
            {({ getFieldValue }) =>
              getFieldValue('paymentMethod') === 'bank' ? (
                <Form.Item name="bankAccountId" label="Tài khoản NH" rules={[{ required: true, message: 'Chọn TK' }]}>
                  <Select
                    options={bankAccounts.map((b) => ({
                      value: b.id,
                      label: `${b.bankName} · ${b.accountNumber}${b.isPrimary ? ' (Chính)' : ''}`,
                    }))}
                    placeholder="Chọn tài khoản"
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item name="customerName" label="Khách hàng / đối tác">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Nội dung / diễn giải">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="transactionDate" label="Ngày giao dịch" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="In danh sách giao dịch"
        open={printOpen}
        onOk={submitPrint}
        onCancel={() => setPrintOpen(false)}
        okText="In"
        cancelText="Hủy"
        destroyOnClose
        width={520}
      >
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          Chọn điều kiện lọc trước khi in. Báo cáo mở tab mới (A4 ngang) và gọi hộp thoại in của trình duyệt.
        </Typography.Paragraph>
        <Form
          form={printForm}
          layout="vertical"
          initialValues={
            {
              flow: 'all',
              period: 'all',
              largeAmountOnly: false,
            } satisfies TransactionPrintFilters
          }
        >
          <Form.Item name="flow" label="Phân loại dòng tiền" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { value: 'all', label: 'Tất cả (thu & chi)' },
                { value: 'income', label: 'Chỉ thu' },
                { value: 'expense', label: 'Chỉ chi' },
              ]}
            />
          </Form.Item>
          <Form.Item name="period" label="Thời gian" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { value: 'all', label: 'Toàn bộ' },
                { value: 'today', label: 'Trong ngày (hôm nay)' },
                { value: 'week', label: 'Trong tuần (tuần hiện tại)' },
                { value: 'month', label: 'Trong tháng (tháng hiện tại)' },
              ]}
            />
          </Form.Item>
          <Form.Item name="largeAmountOnly" valuePropName="checked">
            <Checkbox>
              Chỉ giao dịch có số tiền &gt; {PRINT_LARGE_AMOUNT_THRESHOLD.toLocaleString('vi-VN')} ₫ (hóa đơn / giá trị lớn)
            </Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Hóa đơn điện tử (lite)"
        open={invoiceOpen}
        onOk={submitInvoice}
        onCancel={() => {
          setInvoiceOpen(false)
          setInvoiceTxId(null)
        }}
        destroyOnClose
      >
        <Form form={invForm} layout="vertical">
          <Form.Item name="invoiceNumber" label="Số hóa đơn" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="issuedDate" label="Ngày phát hành">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'draft', label: 'Nháp' },
                { value: 'issued', label: 'Đã xuất' },
                { value: 'cancelled', label: 'Hủy' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .row-highlight td { background: #fff7e6 !important; }
      `}</style>
    </Space>
  )
}
