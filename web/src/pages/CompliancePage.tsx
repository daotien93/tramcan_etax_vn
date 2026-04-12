import { Alert, Card, Col, Progress, Row, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import type { ComplianceIssue } from '../types/domain'
import { buildComplianceIssues, riskScoreFromIssues } from '../lib/compliance'
import { formatDate, formatVnd } from '../lib/format'

export function CompliancePage() {
  const { transactions, documents, bankInflowMock } = useAppData()

  const issues = useMemo(
    () =>
      buildComplianceIssues(transactions, documents, {
        bankInflowTotal: bankInflowMock,
        periodLabel: 'So với tổng vào TK (Settings → Tax & sao kê)',
      }),
    [transactions, documents, bankInflowMock],
  )

  const score = useMemo(() => riskScoreFromIssues(issues), [issues])

  const incomeBankTotal = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'income' && t.paymentMethod === 'bank')
      .reduce((s, t) => s + t.amount, 0)
  }, [transactions])

  const columns: ColumnsType<ComplianceIssue> = [
    {
      title: 'Mức',
      dataIndex: 'severity',
      width: 110,
      render: (s) => (
        <Tag color={s === 'critical' ? 'red' : s === 'warning' ? 'gold' : 'blue'}>{s}</Tag>
      ),
    },
    { title: 'Rule', dataIndex: 'rule', width: 220 },
    { title: 'Chi tiết', dataIndex: 'message' },
    {
      title: 'GD',
      width: 100,
      render: (_, r) =>
        r.transactionId ? (
          <Link to={`/transactions?highlight=${r.transactionId}`}>Mở</Link>
        ) : (
          '—'
        ),
    },
  ]

  const txMap = useMemo(() => new Map(transactions.map((t) => [t.id, t])), [transactions])

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Compliance &amp; rủi ro
      </Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={10}>
          <Card title="Risk score">
            <Progress
              type="dashboard"
              percent={score}
              format={(p) => `${p}`}
              strokeColor={score >= 70 ? '#52c41a' : score >= 40 ? '#faad14' : '#ff4d4f'}
            />
            <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
              Điểm giảm khi vi phạm rule nghiêm trọng (20tr không hợp đồng, lệch sao kê…) hoặc cảnh báo
              mô tả mơ hồ.
            </Typography.Paragraph>
          </Card>
        </Col>
        <Col xs={24} md={14}>
          <Card title="Gợi ý kiểm tra nhanh">
            <Space direction="vertical">
              <Typography.Text>
                Tổng thu kê trên hệ thống:{' '}
                <strong>
                  {formatVnd(
                    transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
                  )}
                </strong>
              </Typography.Text>
              <Typography.Text>
                Tổng thu qua ngân hàng (lọc theo GD):{' '}
                <strong>{formatVnd(incomeBankTotal)}</strong>
              </Typography.Text>
              {bankInflowMock != null && (
                <Typography.Text>
                  Tổng vào TK (mock import sao kê):{' '}
                  <strong>{formatVnd(bankInflowMock)}</strong>
                </Typography.Text>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      {issues.some((i) => i.rule === 'INCOME_VS_BANK_INFLOW') && (
        <Alert
          type="warning"
          showIcon
          message="Rule: Thu ≠ vào tài khoản ngân hàng"
          description="Điều chỉnh tổng vào TK trong Cài đặt hoặc import sao kê đầy đủ để đối soát."
        />
      )}

      <Card title="Danh sách lỗi / cảnh báo">
        <Table<ComplianceIssue>
          rowKey="id"
          columns={columns}
          dataSource={issues}
          pagination={{ pageSize: 12 }}
          expandable={{
            expandedRowRender: (row) =>
              row.transactionId ? (
                <Typography.Text type="secondary">
                  {(() => {
                    const t = txMap.get(row.transactionId)
                    if (!t) return null
                    return (
                      <>
                        {formatDate(t.transactionDate)} · {t.description} · {formatVnd(t.amount)}
                      </>
                    )
                  })()}
                </Typography.Text>
              ) : null,
            rowExpandable: (row) => !!row.transactionId,
          }}
        />
      </Card>
    </Space>
  )
}
