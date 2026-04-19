import { CameraOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PrinterOutlined, WarningOutlined } from '@ant-design/icons'
import {
  Button,
  Checkbox,
  DatePicker,
  Divider,
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
  Upload,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import type {
  DocumentRow,
  PaymentMethod,
  PaymentStatus,
  TaxRate,
  Transaction,
  TransactionCategory,
  TransactionType,
} from '../types/domain'
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
  paymentStatus: PaymentStatus
  vatRate: TaxRate
  vatAmount?: number
  bankAccountId?: string
  customerName: string
  customerTaxCode?: string
  customerIdNumber?: string
  sellerIdNumber?: string
  transactionLocation?: string
  description: string
  transactionDate: dayjs.Dayjs
}

type PrintFormValues = Omit<TransactionPrintFilters, 'customRange'> & {
  customRange?: [dayjs.Dayjs, dayjs.Dayjs]
}

const initialForm = (): Partial<FormValues> => ({
  type: 'income',
  category: 'service',
  paymentMethod: 'bank',
  paymentStatus: 'paid',
  vatRate: '0',
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
    addDocument,
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
  const [printForm] = Form.useForm<PrintFormValues>()
  const [printPreviewRows, setPrintPreviewRows] = useState<Transaction[]>([])
  const [contractModalDocs, setContractModalDocs] = useState<DocumentRow[]>([])
  const [contractPreviewDoc, setContractPreviewDoc] = useState<DocumentRow | null>(null)
  const [invoiceUploadModalOpen, setInvoiceUploadModalOpen] = useState(false)
  const [invoiceUploadTxId, setInvoiceUploadTxId] = useState<string | null>(null)
  const [invoiceUploadFile, setInvoiceUploadFile] = useState<File | null>(null)
  const [invoiceUploadLoading, setInvoiceUploadLoading] = useState(false)

  useEffect(() => {
    if (!highlightId) return
    const el = document.querySelector(`[data-row-key="${highlightId}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightId, transactions])

  const bankLabel = useMemo(() => {
    const m = new Map(bankAccounts.map((b) => [b.id, `${b.bankName} · ${b.accountNumber}`]))
    return m
  }, [bankAccounts])

  const contractDocuments = useMemo(() => {
    const map = new Map<string, DocumentRow[]>()
    documents.forEach((doc) => {
      if (doc.docType !== 'contract') return
      const list = map.get(doc.transactionId) ?? []
      list.push(doc)
      map.set(doc.transactionId, list)
    })
    return map
  }, [documents])

  const openContractDetails = (transactionId: string) => {
    const docs = contractDocuments.get(transactionId) ?? []
    if (docs.length === 0) {
      message.warning('Chưa có hợp đồng cho giao dịch này')
      return
    }
    setContractModalDocs(docs)
    setContractPreviewDoc(docs[0])
  }

  const closeContractModal = () => {
    setContractModalDocs([])
    setContractPreviewDoc(null)
  }

  const openInvoiceUploadModal = (transactionId: string) => {
    setInvoiceUploadTxId(transactionId)
    setInvoiceUploadFile(null)
    setInvoiceUploadModalOpen(true)
  }

  const submitInvoiceUpload = async () => {
    if (!invoiceUploadTxId || !invoiceUploadFile) {
      message.warning('Chọn file hóa đơn để tải lên')
      return
    }

    try {
      setInvoiceUploadLoading(true)
      // Simulate upload
      await new Promise((resolve) => setTimeout(resolve, 500))
      
      addDocument({
        transactionId: invoiceUploadTxId,
        docType: 'invoice',
        file: invoiceUploadFile,
      })
      
      message.success('Tải lên hóa đơn thành công')
      setInvoiceUploadModalOpen(false)
      setInvoiceUploadTxId(null)
      setInvoiceUploadFile(null)
    } catch (err) {
      message.error('Lỗi khi tải lên hóa đơn')
    } finally {
      setInvoiceUploadLoading(false)
    }
  }

  const isImage = (name: string) => /\.(png|jpe?g|gif|webp)$/i.test(name)
  const isPdf = (name: string) => /\.pdf$/i.test(name)

  const buildPrintFilters = (values: Partial<PrintFormValues>): TransactionPrintFilters => ({
    flow: values.flow ?? 'all',
    period: values.period ?? 'all',
    largeAmountOnly: values.largeAmountOnly ?? false,
    customRange:
      values.customRange && values.customRange[0] && values.customRange[1]
        ? [
            values.customRange[0].format('YYYY-MM-DD'),
            values.customRange[1].format('YYYY-MM-DD'),
          ]
        : undefined,
  })

  const updatePrintPreview = (values: Partial<PrintFormValues>) => {
    setPrintPreviewRows(filterTransactionsForPrint(transactions, buildPrintFilters(values)))
  }

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
      paymentStatus: v.paymentStatus,
      vatRate: v.vatRate,
      vatAmount: v.vatAmount,
      bankAccountId: v.paymentMethod === 'bank' ? v.bankAccountId ?? null : null,
      customerName: v.customerName ?? '',
      customerTaxCode: v.customerTaxCode ?? '',
      customerIdNumber: v.customerIdNumber ?? '',
      sellerIdNumber: v.sellerIdNumber ?? '',
      transactionLocation: v.transactionLocation ?? '',
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
    const initialPrintValues: PrintFormValues = {
      flow: 'all',
      period: 'all',
      largeAmountOnly: false,
      customRange: undefined,
    }
    printForm.setFieldsValue(initialPrintValues)
    updatePrintPreview(initialPrintValues)
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
        const printFilters: TransactionPrintFilters = {
          flow: f.flow,
          period: f.period,
          largeAmountOnly: f.largeAmountOnly,
          customRange:
            f.customRange && f.customRange[0] && f.customRange[1]
              ? [f.customRange[0].format('YYYY-MM-DD'), f.customRange[1].format('YYYY-MM-DD')]
              : undefined,
        }
        const rows = filterTransactionsForPrint(transactions, printFilters)
        if (rows.length === 0) {
          w.close()
          message.warning('Không có giao dịch nào thỏa điều kiện đã chọn')
          return Promise.reject(new Error('no_rows'))
        }
        const html = buildTransactionPrintHtml(rows, printFilters, bankLabel)
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
      title: 'Thuế suất',
      width: 96,
      render: (_, r) => (r.vatRate ? (r.vatRate === 'na' ? 'N/A' : `${r.vatRate}%`) : '—'),
    },
    {
      title: 'Tiền thuế',
      dataIndex: 'vatAmount',
      width: 120,
      align: 'right',
      render: (a: number | undefined) => (a != null ? formatVnd(a) : '—'),
    },
    {
      title: 'Thanh toán',
      width: 96,
      render: (_, r) => (r.paymentMethod === 'bank' ? 'Ngân hàng' : 'Tiền mặt'),
    },
    {
      title: 'Trạng thái',
      width: 120,
      render: (_, r) =>
        r.paymentStatus === 'paid' ? (
          <Tag color="success">Đã thu/đã chi</Tag>
        ) : r.paymentStatus === 'unpaid' ? (
          <Tag color="orange">Chưa thu/chi</Tag>
        ) : (
          '—'
        ),
    },
    {
      title: 'Tài khoản',
      width: 180,
      ellipsis: true,
      render: (_, r) =>
        r.bankAccountId ? bankLabel.get(r.bankAccountId) ?? '—' : '—',
    },
    {
      title: 'MST KH',
      dataIndex: 'customerTaxCode',
      ellipsis: true,
      width: 130,
      render: (v: string | undefined) => v || '—',
    },
    {
      title: 'CCCD nhận',
      dataIndex: 'customerIdNumber',
      ellipsis: true,
      width: 140,
      render: (v: string | undefined) => v || '—',
    },
    {
      title: 'CCCD bán',
      dataIndex: 'sellerIdNumber',
      ellipsis: true,
      width: 140,
      render: (v: string | undefined) => v || '—',
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
      title: 'Hợp đồng',
      width: 110,
      render: (_, r) => {
        const docs = contractDocuments.get(r.id) ?? []
        if (docs.length === 0) {
          return <Tag>Chưa có</Tag>
        }
        return (
          <Tag color="green">
            {docs.length} tệp
          </Tag>
        )
      },
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
      width: 180,
      render: (_, r) => (
        <Space size={8}>
          <Button
            size="small"
            style={{ backgroundColor: '#1890ff', color: '#fff', borderColor: '#1890ff' }}
            icon={<EditOutlined />}
            onClick={() => openEdit(r)}
          />
          <Button
            size="small"
            style={{ backgroundColor: '#52c41a', color: '#fff', borderColor: '#52c41a' }}
            icon={<EyeOutlined />}
            onClick={() => openContractDetails(r.id)}
          />
          <Button
            size="small"
            style={{ backgroundColor: '#fa8c16', color: '#fff', borderColor: '#fa8c16' }}
            icon={<CameraOutlined />}
            onClick={() => openInvoiceUploadModal(r.id)}
          />
          <Button
            size="small"
            style={{ backgroundColor: '#722ed1', color: '#fff', borderColor: '#722ed1' }}
            icon={<PrinterOutlined />}
            onClick={() => openInvoiceModal(r.id)}
          />
          <Button
            size="small"
            style={{ backgroundColor: '#ff4d4f', color: '#fff', borderColor: '#ff4d4f' }}
            icon={<DeleteOutlined />}
            onClick={() => removeTransaction(r.id)}
          />
        </Space>
      ),
    },
  ]

  const printPreviewColumns: ColumnsType<Transaction> = [
    {
      title: 'Ngày',
      dataIndex: 'transactionDate',
      width: 120,
      render: (d: string) => formatDate(d),
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      width: 80,
      render: (t: TransactionType) => (t === 'income' ? 'Thu' : 'Chi'),
    },
    {
      title: 'Nhóm',
      dataIndex: 'category',
      width: 120,
      render: (c: TransactionCategory) => {
        const map = { service: 'Cân xe / DV', trading: 'Bán hàng', other: 'Khác' }
        return map[c]
      },
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      width: 140,
      align: 'right',
      render: (a: number) => formatVnd(a),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      ellipsis: true,
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
          <Form.Item name="customerTaxCode" label="MST khách hàng">
            <Input placeholder="0123456789" />
          </Form.Item>
          <Form.Item name="customerIdNumber" label="CCCD/CMND người nhận">
            <Input placeholder="0987654321" />
          </Form.Item>
          <Form.Item name="sellerIdNumber" label="CCCD/CMND người bán">
            <Input placeholder="0123456789" />
          </Form.Item>
          <Form.Item name="paymentStatus" label="Tình trạng thu/chi" rules={[{ required: true }]}> 
            <Select
              options={[
                { value: 'paid', label: 'Đã thu/đã chi' },
                { value: 'unpaid', label: 'Chưa thu/chưa chi' },
              ]}
            />
          </Form.Item>
          <Form.Item name="vatRate" label="Thuế suất" rules={[{ required: true }]}> 
            <Select
              options={[
                { value: '0', label: '0%' },
                { value: '5', label: '5%' },
                { value: '10', label: '10%' },
                { value: 'na', label: 'Không chịu thuế' },
              ]}
            />
          </Form.Item>
          <Form.Item name="vatAmount" label="Tiền thuế (₫)">
            <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item name="transactionLocation" label="Địa điểm / kênh bán">
            <Input placeholder="Cửa hàng / Online / Giao tại nhà" />
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
            } satisfies PrintFormValues
          }
          onValuesChange={(_, values) => updatePrintPreview(values)}
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
                { value: 'custom', label: 'Chọn ngày' },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.period !== cur.period}>
            {({ getFieldValue }) =>
              getFieldValue('period') === 'custom' ? (
                <Form.Item
                  name="customRange"
                  label="Khoảng ngày"
                  rules={[{ required: true, message: 'Chọn ngày bắt đầu và kết thúc' }]}
                >
                  <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item name="largeAmountOnly" valuePropName="checked">
            <Checkbox>
              Chỉ giao dịch có số tiền &gt; {PRINT_LARGE_AMOUNT_THRESHOLD.toLocaleString('vi-VN')} ₫ (hóa đơn / giá trị lớn)
            </Checkbox>
          </Form.Item>
        </Form>
        <Typography.Title level={5} style={{ marginTop: 24, marginBottom: 12 }}>
          Bản nháp giao dịch
        </Typography.Title>
        {printPreviewRows.length === 0 ? (
          <Typography.Paragraph type="secondary">
            Không có giao dịch thỏa điều kiện.
          </Typography.Paragraph>
        ) : (
          <Table<Transaction>
            rowKey="id"
            columns={printPreviewColumns}
            dataSource={printPreviewRows}
            pagination={{ pageSize: 5, showSizeChanger: true }}
            scroll={{ x: 900, y: 240 }}
            size="small"
          />
        )}
      </Modal>

      <Modal
        title="Chi tiết hợp đồng"
        open={contractModalDocs.length > 0}
        onCancel={closeContractModal}
        footer={null}
        destroyOnClose
        width={820}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {contractPreviewDoc ? (
            <>
              <div
                style={{
                  padding: 12,
                  background: '#fafafa',
                  borderRadius: 6,
                  border: '1px solid #f0f0f0',
                }}
              >
                <Typography.Title level={5} style={{ margin: '0 0 12px' }}>
                  Thông tin giao dịch
                </Typography.Title>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>Ngày:</span> {transactions.find((t) => t.id === contractPreviewDoc.transactionId)?.transactionDate ? formatDate(transactions.find((t) => t.id === contractPreviewDoc.transactionId)!.transactionDate) : '—'}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>Loại:</span>{' '}
                    {transactions.find((t) => t.id === contractPreviewDoc.transactionId)?.type === 'income' ? 'Thu' : 'Chi'}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>Số tiền:</span>{' '}
                    {formatVnd(transactions.find((t) => t.id === contractPreviewDoc.transactionId)?.amount ?? 0)}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>Đối tác:</span> {transactions.find((t) => t.id === contractPreviewDoc.transactionId)?.customerName || '—'}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>Mô tả:</span> {transactions.find((t) => t.id === contractPreviewDoc.transactionId)?.description || '—'}
                  </div>
                </Space>
              </div>
              <Divider style={{ margin: '0' }} />
              <Typography.Title level={5} style={{ margin: 0 }}>
                Hợp đồng đính kèm
              </Typography.Title>
              {contractModalDocs.length > 1 ? (
                <Space wrap>
                  {contractModalDocs.map((doc) => (
                    <Button
                      key={doc.id}
                      type={doc.id === contractPreviewDoc?.id ? 'primary' : 'default'}
                      onClick={() => setContractPreviewDoc(doc)}
                    >
                      {doc.fileName}
                    </Button>
                  ))}
                </Space>
              ) : null}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <a href={contractPreviewDoc.fileUrl} download={contractPreviewDoc.fileName}>
                  <Button type="primary" size="small">
                    Tải xuống
                  </Button>
                </a>
                <a href={contractPreviewDoc.fileUrl} target="_blank" rel="noreferrer">
                  <Button size="small">
                    Mở trong tab mới
                  </Button>
                </a>
              </div>
              {isImage(contractPreviewDoc.fileName) ? (
                <img
                  src={contractPreviewDoc.fileUrl}
                  alt={contractPreviewDoc.fileName}
                  style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 6 }}
                />
              ) : isPdf(contractPreviewDoc.fileName) ? (
                <iframe
                  title={contractPreviewDoc.fileName}
                  src={contractPreviewDoc.fileUrl}
                  style={{ width: '100%', height: '70vh', border: '1px solid #f0f0f0', borderRadius: 6 }}
                />
              ) : (
                <Typography.Paragraph type="secondary">
                  Không xem trước trực tiếp loại file này. Nhấn nút trên để tải xuống hoặc mở file.
                </Typography.Paragraph>
              )}
            </>
          ) : (
            <Typography.Paragraph>Chưa có hợp đồng để xem.</Typography.Paragraph>
          )}
        </Space>
      </Modal>

      <Modal
        title="Tải lên hóa đơn"
        open={invoiceUploadModalOpen}
        onOk={submitInvoiceUpload}
        onCancel={() => {
          setInvoiceUploadModalOpen(false)
          setInvoiceUploadTxId(null)
          setInvoiceUploadFile(null)
        }}
        okText="Tải lên"
        cancelText="Hủy"
        confirmLoading={invoiceUploadLoading}
        destroyOnClose
        width={520}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Typography.Paragraph type="secondary">
            Chọn ảnh hóa đơn từ điện thoại hoặc máy tính. Hỗ trợ chụp trực tiếp từ camera.
          </Typography.Paragraph>
          <Upload
            accept="image/*,.pdf"
            maxCount={1}
            beforeUpload={() => false}
            onChange={({ fileList }) => {
              if (fileList.length > 0 && fileList[0].originFileObj) {
                setInvoiceUploadFile(fileList[0].originFileObj)
              }
            }}
          >
            <Button type="dashed" block size="large">
              📷 Chọn / Chụp ảnh hóa đơn
            </Button>
          </Upload>
          {invoiceUploadFile && (
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              <strong>File đã chọn:</strong> {invoiceUploadFile.name}
            </Typography.Paragraph>
          )}
        </Space>
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
