import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import type { Transaction, TransactionType } from '../types/domain'
import { formatDate, formatVnd } from './format'

dayjs.extend(isoWeek)

const HIGH = 20_000_000

export type PrintFlowFilter = 'all' | 'income' | 'expense'

export type PrintPeriodFilter = 'all' | 'today' | 'week' | 'month'

export type TransactionPrintFilters = {
  flow: PrintFlowFilter
  period: PrintPeriodFilter
  /** Chỉ giao dịch có số tiền > 20.000.000 ₫ */
  largeAmountOnly: boolean
}

function inPeriod(isoDate: string, period: PrintPeriodFilter): boolean {
  if (period === 'all') return true
  const d = dayjs(isoDate)
  const now = dayjs()
  if (period === 'today') {
    return d.isSame(now, 'day')
  }
  if (period === 'week') {
    const start = now.startOf('isoWeek')
    const end = now.endOf('isoWeek')
    const ds = d.format('YYYY-MM-DD')
    return ds >= start.format('YYYY-MM-DD') && ds <= end.format('YYYY-MM-DD')
  }
  if (period === 'month') {
    return d.isSame(now, 'month')
  }
  return true
}

export function filterTransactionsForPrint(
  list: Transaction[],
  f: TransactionPrintFilters,
): Transaction[] {
  return list.filter((t) => {
    if (f.flow !== 'all' && t.type !== f.flow) return false
    if (!inPeriod(t.transactionDate, f.period)) return false
    if (f.largeAmountOnly && t.amount <= HIGH) return false
    return true
  })
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function flowLabel(flow: PrintFlowFilter) {
  if (flow === 'income') return 'Thu'
  if (flow === 'expense') return 'Chi'
  return 'Tất cả (thu & chi)'
}

function periodLabel(period: PrintPeriodFilter) {
  const map: Record<PrintPeriodFilter, string> = {
    all: 'Toàn bộ thời gian',
    today: 'Trong ngày (hôm nay)',
    week: 'Trong tuần (tuần ISO hiện tại)',
    month: 'Trong tháng (tháng hiện tại)',
  }
  return map[period]
}

function typeLabel(t: TransactionType) {
  return t === 'income' ? 'Thu' : 'Chi'
}

function categoryLabel(c: Transaction['category']) {
  const map = { service: 'Dịch vụ / cân xe', trading: 'Bán hàng', other: 'Khác' }
  return map[c]
}

export function buildTransactionPrintHtml(
  rows: Transaction[],
  filters: TransactionPrintFilters,
  bankLabel: Map<string, string>,
): string {
  const sorted = [...rows].sort(
    (a, b) => b.transactionDate.localeCompare(a.transactionDate) || b.id.localeCompare(a.id),
  )

  const sumThu = sorted.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const sumChi = sorted.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const rowsHtml = sorted
    .map(
      (t) => `
    <tr>
      <td>${escapeHtml(formatDate(t.transactionDate))}</td>
      <td>${escapeHtml(typeLabel(t.type))}</td>
      <td>${escapeHtml(categoryLabel(t.category))}</td>
      <td class="num">${escapeHtml(formatVnd(t.amount))}</td>
      <td>${escapeHtml(t.paymentMethod === 'bank' ? 'Ngân hàng' : 'Tiền mặt')}</td>
      <td>${escapeHtml(t.bankAccountId ? bankLabel.get(t.bankAccountId) ?? '—' : '—')}</td>
      <td>${escapeHtml(t.customerName || '—')}</td>
      <td>${escapeHtml(t.description || '—')}</td>
    </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Báo cáo giao dịch — TramCan E-Tax</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 24px; color: #1f1f1f; font-size: 12px; }
    h1 { font-size: 18px; margin: 0 0 8px; font-weight: 600; }
    .meta { color: #595959; margin-bottom: 16px; line-height: 1.5; }
    .meta strong { color: #262626; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d9d9d9; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #fafafa; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.02em; }
    td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #f0f0f0; display: flex; gap: 24px; flex-wrap: wrap; }
    .footer span { color: #595959; }
    .footer strong { color: #262626; }
    @media print {
      body { margin: 12mm; }
      @page { size: A4 landscape; margin: 10mm; }
    }
  </style>
</head>
<body>
  <h1>Báo cáo giao dịch</h1>
  <div class="meta">
    <div><strong>Phân loại dòng tiền:</strong> ${escapeHtml(flowLabel(filters.flow))}</div>
    <div><strong>Thời gian:</strong> ${escapeHtml(periodLabel(filters.period))}</div>
    <div><strong>Lọc số tiền:</strong> ${filters.largeAmountOnly ? `Chỉ giao dịch &gt; ${HIGH.toLocaleString('vi-VN')} ₫` : 'Không giới hạn'}</div>
    <div><strong>In lúc:</strong> ${escapeHtml(dayjs().format('DD/MM/YYYY HH:mm'))}</div>
    <div><strong>Số dòng:</strong> ${sorted.length}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Ngày</th>
        <th>Loại</th>
        <th>Nhóm</th>
        <th>Số tiền</th>
        <th>Thanh toán</th>
        <th>Tài khoản NH</th>
        <th>Đối tác / KH</th>
        <th>Nội dung</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="8" style="text-align:center;padding:24px">Không có giao dịch thỏa điều kiện</td></tr>'}
    </tbody>
  </table>
  <div class="footer">
    <span>Tổng thu (trong danh sách): <strong>${escapeHtml(formatVnd(sumThu))}</strong></span>
    <span>Tổng chi (trong danh sách): <strong>${escapeHtml(formatVnd(sumChi))}</strong></span>
    <span>Chênh (thu − chi): <strong>${escapeHtml(formatVnd(sumThu - sumChi))}</strong></span>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 200);
    });
  </script>
</body>
</html>`
}

/** Gán nội dung in vào cửa sổ đã mở sẵn (phải mở đồng bộ trong click để tránh popup blocker). */
export function navigateWindowToPrintHtml(w: Window, html: string): void {
  const blob = new Blob([`\uFEFF${html}`], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  w.location.replace(url)
  const revoke = () => {
    try {
      URL.revokeObjectURL(url)
    } catch {
      /* ignore */
    }
  }
  w.addEventListener('beforeunload', revoke)
  window.setTimeout(revoke, 120_000)
}

/** Mở tab mới rồi in — chỉ gọi trực tiếp trong handler đồng bộ; sau await có thể bị chặn. */
export function openTransactionPrintWindow(
  rows: Transaction[],
  filters: TransactionPrintFilters,
  bankLabel: Map<string, string>,
): boolean {
  const w = window.open('about:blank', '_blank')
  if (!w) return false
  const html = buildTransactionPrintHtml(rows, filters, bankLabel)
  navigateWindowToPrintHtml(w, html)
  return true
}

export { HIGH as PRINT_LARGE_AMOUNT_THRESHOLD }
