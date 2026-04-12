import {
  Alert,
  Badge,
  Card,
  Col,
  Divider,
  Flex,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  theme,
  Typography,
} from 'antd'
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BankOutlined,
  FileProtectOutlined,
  PieChartOutlined,
  RiseOutlined,
  SafetyCertificateOutlined,
  TransactionOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import dayjs from 'dayjs'
import type { CSSProperties, ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import { formatVnd, monthKey, monthLabel } from '../lib/format'
import { incomeTaxForLine } from '../lib/tax'
import {
  buildComplianceIssues,
  isHighValueWithoutContract,
  riskScoreFromIssues,
} from '../lib/compliance'
import type { Transaction } from '../types/domain'

export function DashboardPage() {
  const { token } = theme.useToken()
  const { transactions, documents, bankInflowMock, taxRates } = useAppData()
  const [period, setPeriod] = useState<string>('all')

  const yearOptions = useMemo(() => {
    const ys = new Set<number>()
    for (const t of transactions) ys.add(dayjs(t.transactionDate).year())
    return [...ys].sort((a, b) => b - a)
  }, [transactions])

  const filteredTx = useMemo(() => {
    if (period === 'all') return transactions
    const y = Number(period)
    return transactions.filter((t) => dayjs(t.transactionDate).year() === y)
  }, [transactions, period])

  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of filteredTx) {
      if (t.type === 'income') income += t.amount
      else expense += t.amount
    }
    return { income, expense, profit: income - expense }
  }, [filteredTx])

  const taxSummary = useMemo(() => {
    let vat = 0
    let pit = 0
    for (const t of filteredTx) {
      if (t.type !== 'income') continue
      const { vat: v, pit: p } = incomeTaxForLine(t.amount, t.category, taxRates)
      vat += v
      pit += p
    }
    return { vat, pit, total: vat + pit }
  }, [filteredTx, taxRates])

  const chartData = useMemo(() => {
    const map = new Map<string, { key: string; label: string; Thu: number; Chi: number }>()
    for (const t of filteredTx) {
      const key = monthKey(t.transactionDate)
      if (!map.has(key)) {
        map.set(key, { key, label: monthLabel(key), Thu: 0, Chi: 0 })
      }
      const row = map.get(key)!
      if (t.type === 'income') row.Thu += t.amount
      else row.Chi += t.amount
    }
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
  }, [filteredTx])

  const pieData = useMemo(() => {
    if (totals.income === 0 && totals.expense === 0) {
      return [
        { name: 'Chưa có dữ liệu', value: 1, fill: token.colorFillSecondary },
      ]
    }
    return [
      { name: 'Tổng thu', value: totals.income, fill: token.colorPrimary },
      { name: 'Tổng chi', value: totals.expense, fill: token.colorWarning },
    ]
  }, [totals.income, totals.expense, token.colorFillSecondary, token.colorPrimary, token.colorWarning])

  const criticalAlerts = useMemo(() => {
    return filteredTx.filter((t) => isHighValueWithoutContract(t, documents))
  }, [filteredTx, documents])

  const complianceIssues = useMemo(
    () =>
      buildComplianceIssues(filteredTx, documents, {
        bankInflowTotal: bankInflowMock,
        periodLabel: 'So với tổng vào TK (Settings)',
      }),
    [filteredTx, documents, bankInflowMock],
  )

  const riskScore = useMemo(() => riskScoreFromIssues(complianceIssues), [complianceIssues])
  const topIssues = complianceIssues.slice(0, 6)

  const recentTx = useMemo(() => {
    return [...filteredTx]
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
      .slice(0, 6)
  }, [filteredTx])

  const marginPct =
    totals.income > 0 ? Math.round((totals.profit / totals.income) * 1000) / 10 : 0

  const cardSurface: CSSProperties = {
    borderRadius: token.borderRadiusLG,
    border: `1px solid ${token.colorBorderSecondary}`,
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 2px 8px -2px rgba(0, 0, 0, 0.04)',
  }

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto' }}>
      <Flex vertical gap="large">
        {/* Page header */}
        <Flex justify="space-between" align="flex-start" wrap="wrap" gap={16}>
          <div>
            <Typography.Title level={3} style={{ margin: 0, fontWeight: 600 }}>
              Tổng quan tài chính
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              Theo dõi dòng tiền, thuế ước tính và cảnh báo tuân thủ — cập nhật theo sổ giao dịch.
            </Typography.Text>
          </div>
          <Space align="center" wrap>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              Phạm vi
            </Typography.Text>
            <Select
              value={period}
              onChange={setPeriod}
              style={{ minWidth: 140 }}
              options={[
                { value: 'all', label: 'Toàn bộ dữ liệu' },
                ...yearOptions.map((y) => ({ value: String(y), label: `Năm ${y}` })),
              ]}
            />
          </Space>
        </Flex>

        {criticalAlerts.length > 0 && (
          <Alert
            type="error"
            showIcon
            icon={<WarningOutlined />}
            message={
              <Space>
                <span style={{ fontWeight: 600 }}>Cần xử lý chứng từ</span>
                <Badge
                  count={criticalAlerts.length}
                  style={{ backgroundColor: token.colorError }}
                />
              </Space>
            }
            description={
              <span>
                Giao dịch thu &gt; 20.000.000 ₫ chưa có hợp đồng đính kèm.{' '}
                <Link to="/transactions">Xem danh sách</Link>
                {' · '}
                <Link to="/documents">Tải hợp đồng</Link>
              </span>
            }
            style={{
              borderRadius: token.borderRadiusLG,
              border: `1px solid ${token.colorErrorBorder}`,
            }}
          />
        )}

        {/* KPI row */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} xl={6}>
            <KpiCard
              title="Tổng thu"
              value={totals.income}
              formatter={(v) => formatVnd(Number(v))}
              icon={<RiseOutlined />}
              accent={token.colorPrimary}
              hint="Thu nhập đã ghi nhận trong phạm vi lọc"
              cardStyle={cardSurface}
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <KpiCard
              title="Tổng chi"
              value={totals.expense}
              formatter={(v) => formatVnd(Number(v))}
              icon={<ArrowDownOutlined />}
              accent={token.colorWarning}
              hint="Chi phí & thanh toán"
              cardStyle={cardSurface}
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <KpiCard
              title="Lợi nhuận ròng"
              value={totals.profit}
              formatter={(v) => formatVnd(Number(v))}
              icon={<ArrowUpOutlined />}
              accent={totals.profit >= 0 ? token.colorSuccess : token.colorError}
              hint={
                totals.income > 0
                  ? `Biên lợi nhuận ~ ${marginPct}% trên doanh thu`
                  : 'Chưa có doanh thu trong kỳ'
              }
              valueStyle={{ color: totals.profit >= 0 ? token.colorSuccess : token.colorError }}
              cardStyle={cardSurface}
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <KpiCard
              title="Thuế ước tính (GTGT + TNCN)"
              value={taxSummary.total}
              formatter={(v) => formatVnd(Number(v))}
              icon={<BankOutlined />}
              accent={token.colorInfo}
              hint={`GTGT ${formatVnd(taxSummary.vat)} · TNCN ${formatVnd(taxSummary.pit)}`}
              cardStyle={cardSurface}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {/* Main chart */}
          <Col xs={24} lg={16}>
            <Card
              title={
                <Space>
                  <TransactionOutlined style={{ color: token.colorPrimary }} />
                  <span>Dòng tiền theo tháng</span>
                </Space>
              }
              extra={<Link to="/transactions">Chi tiết giao dịch</Link>}
              styles={{ body: { paddingTop: 8 } }}
              style={cardSurface}
            >
              {chartData.length === 0 ? (
                <Flex align="center" justify="center" style={{ height: 340 }}>
                  <Typography.Text type="secondary">Chưa có dữ liệu trong phạm vi đã chọn</Typography.Text>
                </Flex>
              ) : (
                <div style={{ width: '100%', height: 360 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={chartData}
                      margin={{ top: 16, right: 16, left: 4, bottom: 8 }}
                      barGap={4}
                      barCategoryGap="18%"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke={token.colorSplit}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: token.colorTextSecondary, fontSize: 12 }}
                        axisLine={{ stroke: token.colorBorderSecondary }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => `${(Number(v) / 1e6).toFixed(0)} tr`}
                        width={52}
                        tick={{ fill: token.colorTextSecondary, fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: token.borderRadius,
                          border: `1px solid ${token.colorBorderSecondary}`,
                          boxShadow: token.boxShadowSecondary,
                        }}
                        formatter={(value) => formatVnd(Number(value ?? 0))}
                        labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: 16 }}
                        formatter={(value) => (value === 'Thu' ? 'Thu vào' : 'Chi ra')}
                      />
                      <Bar
                        name="Thu vào"
                        dataKey="Thu"
                        fill={token.colorPrimary}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                      />
                      <Bar
                        name="Chi ra"
                        dataKey="Chi"
                        fill={token.colorWarning}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </Col>

          {/* Side column */}
          <Col xs={24} lg={8}>
            <Flex vertical gap={16}>
              <Card
                title={
                  <Space>
                    <PieChartOutlined style={{ color: token.colorPrimary }} />
                    <span>Cơ cấu thu / chi</span>
                  </Space>
                }
                style={cardSurface}
              >
                <div style={{ height: 220 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatVnd(Number(value ?? 0))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Flex justify="space-between">
                    <Typography.Text type="secondary">Tổng thu</Typography.Text>
                    <Typography.Text strong>{formatVnd(totals.income)}</Typography.Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Typography.Text type="secondary">Tổng chi</Typography.Text>
                    <Typography.Text strong>{formatVnd(totals.expense)}</Typography.Text>
                  </Flex>
                </Space>
              </Card>

              <Card
                title={
                  <Space>
                    <SafetyCertificateOutlined style={{ color: token.colorWarning }} />
                    <span>Điểm tuân thủ</span>
                  </Space>
                }
                extra={
                  <Link to="/compliance">
                    <Typography.Link>Báo cáo</Typography.Link>
                  </Link>
                }
                style={cardSurface}
              >
                <Flex align="center" gap={20} wrap="wrap">
                  <Progress
                    type="dashboard"
                    percent={riskScore}
                    size={120}
                    strokeColor={
                      riskScore >= 70
                        ? token.colorSuccess
                        : riskScore >= 40
                          ? token.colorWarning
                          : token.colorError
                    }
                    format={(p) => `${p}`}
                  />
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      Tổng hợp rule: hợp đồng &gt;20tr, mô tả giao dịch, đối soát sao kê NH.
                    </Typography.Text>
                    <div style={{ marginTop: 8 }}>
                      <Tag color={complianceIssues.length === 0 ? 'success' : 'warning'}>
                        {complianceIssues.length} cảnh báo đang mở
                      </Tag>
                    </div>
                  </div>
                </Flex>
              </Card>
            </Flex>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={14}>
            <Card
              title={
                <Space>
                  <FileProtectOutlined style={{ color: token.colorError }} />
                  <span>Cảnh báo & kiểm soát</span>
                </Space>
              }
              extra={<Link to="/compliance">Xem tất cả</Link>}
              style={cardSurface}
            >
              <Table
                size="small"
                pagination={false}
                rowKey="id"
                dataSource={topIssues}
                locale={{ emptyText: 'Không có cảnh báo trong phạm vi đã chọn' }}
                columns={[
                  {
                    title: 'Mức',
                    dataIndex: 'severity',
                    width: 96,
                    render: (s: string) => (
                      <Tag
                        color={
                          s === 'critical' ? 'red' : s === 'warning' ? 'gold' : 'blue'
                        }
                        style={{ marginInlineEnd: 0 }}
                      >
                        {s === 'critical' ? 'Nghiêm trọng' : s === 'warning' ? 'Cảnh báo' : 'Thông tin'}
                      </Tag>
                    ),
                  },
                  { title: 'Mã rule', dataIndex: 'rule', width: 200, ellipsis: true },
                  { title: 'Diễn giải', dataIndex: 'message', ellipsis: true },
                  {
                    title: '',
                    width: 100,
                    align: 'right',
                    render: (_, row) =>
                      row.transactionId ? (
                        <Link to={`/transactions?highlight=${row.transactionId}`}>Mở GD</Link>
                      ) : (
                        <Link to="/compliance">Chi tiết</Link>
                      ),
                  },
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} xl={10}>
            <Card
              title={
                <Space>
                  <RiseOutlined style={{ color: token.colorPrimary }} />
                  <span>Giao dịch gần đây</span>
                </Space>
              }
              extra={<Link to="/transactions">Mở sổ</Link>}
              style={cardSurface}
            >
              <Table<Transaction>
                size="small"
                pagination={false}
                rowKey="id"
                dataSource={recentTx}
                locale={{ emptyText: 'Chưa có giao dịch' }}
                columns={[
                  {
                    title: 'Ngày',
                    dataIndex: 'transactionDate',
                    width: 96,
                    render: (d: string) => dayjs(d).format('DD/MM/YY'),
                  },
                  {
                    title: 'Loại',
                    width: 72,
                    render: (_, r) => (
                      <Tag color={r.type === 'income' ? 'green' : 'orange'}>
                        {r.type === 'income' ? 'Thu' : 'Chi'}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Số tiền',
                    dataIndex: 'amount',
                    align: 'right',
                    width: 120,
                    render: (a: number) => formatVnd(a),
                  },
                  {
                    title: 'Diễn giải',
                    dataIndex: 'description',
                    ellipsis: true,
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </Flex>
    </div>
  )
}

type KpiProps = {
  title: string
  value: number
  formatter: (v: string | number | undefined) => ReactNode
  icon: ReactNode
  accent: string
  hint: string
  valueStyle?: CSSProperties
  cardStyle?: CSSProperties
}

function KpiCard({ title, value, formatter, icon, accent, hint, valueStyle, cardStyle }: KpiProps) {
  const { token } = theme.useToken()

  return (
    <Card bordered={false} style={{ ...cardStyle, height: '100%' }} styles={{ body: { padding: 20 } }}>
      <Flex justify="space-between" align="flex-start" gap={12}>
        <div style={{ minWidth: 0 }}>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 13, display: 'block', marginBottom: 8 }}
          >
            {title}
          </Typography.Text>
          <Statistic
            value={value}
            formatter={formatter}
            valueStyle={{
              fontSize: 22,
              fontWeight: 600,
              lineHeight: 1.25,
              ...valueStyle,
            }}
          />
          <Typography.Paragraph
            type="secondary"
            style={{
              fontSize: 12,
              marginTop: 10,
              marginBottom: 0,
              lineHeight: 1.45,
            }}
          >
            {hint}
          </Typography.Paragraph>
        </div>
        <div
          style={{
            flexShrink: 0,
            width: 48,
            height: 48,
            borderRadius: token.borderRadiusLG,
            background: `${accent}18`,
            color: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
          }}
        >
          {icon}
        </div>
      </Flex>
    </Card>
  )
}
