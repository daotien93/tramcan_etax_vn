import type {
  ComplianceIssue,
  DocumentRow,
  Transaction,
} from '../types/domain'

const HIGH_AMOUNT = 20_000_000
const MIN_DESC_LEN = 8

function id() {
  return crypto.randomUUID()
}

export function hasContractForTransaction(
  transactionId: string,
  documents: DocumentRow[],
) {
  return documents.some(
    (d) => d.transactionId === transactionId && d.docType === 'contract',
  )
}

export function isHighValueWithoutContract(
  t: Transaction,
  documents: DocumentRow[],
) {
  if (t.type !== 'income') return false
  if (t.amount <= HIGH_AMOUNT) return false
  return !hasContractForTransaction(t.id, documents)
}

export function isVagueDescription(t: Transaction) {
  const s = (t.description ?? '').trim()
  return s.length < MIN_DESC_LEN
}

/** Rule 1 demo: tổng thu bank trong kỳ vs tổng dòng sao kê `in` (mock một con số mục tiêu). */
export function buildComplianceIssues(
  transactions: Transaction[],
  documents: DocumentRow[],
  options?: {
    /** Tổng tiền vào ngân hàng kỳ hiện tại (import sao kê) — để trống thì bỏ qua rule 1 */
    bankInflowTotal?: number | null
    periodLabel?: string
  },
): ComplianceIssue[] {
  const issues: ComplianceIssue[] = []

  for (const t of transactions) {
    if (isHighValueWithoutContract(t, documents)) {
      issues.push({
        id: id(),
        rule: 'HIGH_VALUE_NO_CONTRACT',
        severity: 'critical',
        message: `Giao dịch thu > ${HIGH_AMOUNT.toLocaleString('vi-VN')} ₫ chưa có hợp đồng đính kèm.`,
        transactionId: t.id,
      })
    }
    if (isVagueDescription(t)) {
      issues.push({
        id: id(),
        rule: 'VAGUE_DESCRIPTION',
        severity: 'warning',
        message: 'Mô tả / nội dung CK chưa đủ rõ (dưới 8 ký tự có nghĩa).',
        transactionId: t.id,
      })
    }
  }

  const bankIncomeTotal = transactions
    .filter((t) => t.type === 'income' && t.paymentMethod === 'bank')
    .reduce((s, t) => s + t.amount, 0)

  if (
    options?.bankInflowTotal != null &&
    options.bankInflowTotal >= 0 &&
    Math.abs(bankIncomeTotal - options.bankInflowTotal) > 1
  ) {
    issues.push({
      id: id(),
      rule: 'INCOME_VS_BANK_INFLOW',
      severity: 'critical',
      message: `Tổng thu qua NH (${bankIncomeTotal.toLocaleString('vi-VN')} ₫) khác tổng tiền vào TK (${options.bankInflowTotal.toLocaleString('vi-VN')} ₫)${options.periodLabel ? ` — ${options.periodLabel}` : ''}.`,
    })
  }

  return issues
}

export function riskScoreFromIssues(issues: ComplianceIssue[]) {
  let score = 100
  for (const i of issues) {
    if (i.severity === 'critical') score -= 25
    else if (i.severity === 'warning') score -= 10
    else score -= 3
  }
  return Math.max(0, Math.min(100, score))
}
