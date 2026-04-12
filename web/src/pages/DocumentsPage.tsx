import { EyeOutlined, UploadOutlined } from '@ant-design/icons'
import {
  Button,
  Form,
  Modal,
  Select,
  Space,
  Table,
  Typography,
  Upload,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import { useMemo, useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import type { DocumentRow, DocumentType } from '../types/domain'
import { formatDate, formatVnd } from '../lib/format'

export function DocumentsPage() {
  const { documents, transactions, addDocument, removeDocument } = useAppData()
  const [preview, setPreview] = useState<DocumentRow | null>(null)
  const [form] = Form.useForm<{ transactionId: string; docType: DocumentType }>()
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const txMap = useMemo(() => {
    const m = new Map(transactions.map((t) => [t.id, t]))
    return m
  }, [transactions])

  const docTypeLabel: Record<DocumentType, string> = {
    contract: 'Hợp đồng',
    invoice: 'Hóa đơn',
    receipt: 'Phiếu thu / chi',
  }

  const columns: ColumnsType<DocumentRow> = [
    {
      title: 'Giao dịch',
      width: 220,
      render: (_, r) => {
        const t = txMap.get(r.transactionId)
        if (!t) return r.transactionId
        return (
          <span>
            {formatDate(t.transactionDate)} · {t.type === 'income' ? 'Thu' : 'Chi'} ·{' '}
            {formatVnd(t.amount)}
          </span>
        )
      },
    },
    {
      title: 'Loại chứng từ',
      dataIndex: 'docType',
      width: 140,
      render: (d: DocumentType) => docTypeLabel[d],
    },
    { title: 'Tệp', dataIndex: 'fileName', ellipsis: true },
    {
      title: 'Thao tác',
      key: 'a',
      width: 200,
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setPreview(r)}>
            Xem
          </Button>
          <Button type="link" size="small" danger onClick={() => removeDocument(r.id)}>
            Xóa
          </Button>
        </Space>
      ),
    },
  ]

  const submitUpload = async () => {
    const v = await form.validateFields()
    const f = fileList[0]
    if (!f?.originFileObj) {
      message.warning('Chọn file để tải lên')
      return
    }
    addDocument({
      transactionId: v.transactionId,
      docType: v.docType,
      file: f.originFileObj,
    })
    form.resetFields()
    setFileList([])
    message.success('Đã lưu chứng từ (local demo)')
  }

  const isImage = (name: string) => /\.(png|jpe?g|gif|webp)$/i.test(name)
  const isPdf = (name: string) => /\.pdf$/i.test(name)

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Chứng từ
      </Typography.Title>

      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Liên kết với giao dịch. Khi nối API, URL sẽ trỏ tới Supabase Storage / S3.
      </Typography.Paragraph>

      <Space wrap align="start" style={{ width: '100%' }}>
        <Form form={form} layout="inline" style={{ rowGap: 12 }}>
          <Form.Item
            name="transactionId"
            label="Giao dịch"
            rules={[{ required: true, message: 'Chọn GD' }]}
            style={{ minWidth: 280 }}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn giao dịch"
              options={transactions.map((t) => ({
                value: t.id,
                label: `${formatDate(t.transactionDate)} — ${t.description || '(Không mô tả)'} — ${formatVnd(t.amount)}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="docType" label="Loại" rules={[{ required: true }]} initialValue="contract">
            <Select
              style={{ width: 200 }}
              options={[
                { value: 'contract', label: 'Hợp đồng' },
                { value: 'invoice', label: 'Hóa đơn' },
                { value: 'receipt', label: 'Phiếu thu/chi' },
              ]}
            />
          </Form.Item>
          <Form.Item label="File">
            <Upload
              maxCount={1}
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList: fl }) => setFileList(fl)}
            >
              <Button icon={<UploadOutlined />}>Chọn file</Button>
            </Upload>
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={submitUpload}>
              Lưu chứng từ
            </Button>
          </Form.Item>
        </Form>
      </Space>

      <Table<DocumentRow> rowKey="id" columns={columns} dataSource={documents} pagination={{ pageSize: 8 }} />

      <Modal
        title={preview?.fileName ?? 'Xem trước'}
        open={!!preview}
        onCancel={() => setPreview(null)}
        footer={null}
        width={720}
        destroyOnClose
      >
        {preview &&
          (isImage(preview.fileName) ? (
            <img
              src={preview.fileUrl}
              alt={preview.fileName}
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
            />
          ) : isPdf(preview.fileName) ? (
            <iframe
              title={preview.fileName}
              src={preview.fileUrl}
              style={{ width: '100%', height: '70vh', border: '1px solid #f0f0f0' }}
            />
          ) : (
            <Typography.Paragraph>
              Không xem trước trực tiếp loại file này.{' '}
              <a href={preview.fileUrl} target="_blank" rel="noreferrer">
                Mở trong tab mới
              </a>
            </Typography.Paragraph>
          ))}
      </Modal>
    </Space>
  )
}
