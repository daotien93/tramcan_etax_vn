export type TransactionType = 'income' | 'expense'

export type TransactionCategory = 'service' | 'trading' | 'other'

export type PaymentMethod = 'bank' | 'cash'

export type DocumentType = 'contract' | 'invoice' | 'receipt'

export type InvoiceStatus = 'draft' | 'issued' | 'cancelled'

export interface BankAccount {
  id: string
  bankName: string
  accountNumber: string
  ownerName: string
  isPrimary: boolean
}

export interface Transaction {
  id: string
  type: TransactionType
  category: TransactionCategory
  amount: number
  paymentMethod: PaymentMethod
  bankAccountId: string | null
  customerName: string
  description: string
  transactionDate: string
}

export interface DocumentRow {
  id: string
  transactionId: string
  docType: DocumentType
  /** Blob/object URL hoặc URL từ API */
  fileUrl: string
  fileName: string
}

export interface InvoiceRow {
  id: string
  transactionId: string
  invoiceNumber: string
  issuedDate: string | null
  status: InvoiceStatus
}

export interface BusinessProfile {
  businessName: string
  taxCode: string
  ownerName: string
  cccdNumber: string
  licenseFileUrl: string | null
  licenseFileName: string | null
}

export interface TaxRates {
  serviceVat: number
  servicePit: number
  tradingVat: number
  tradingPit: number
}

export type ComplianceSeverity = 'critical' | 'warning' | 'info'

export interface ComplianceIssue {
  id: string
  rule: string
  message: string
  severity: ComplianceSeverity
  transactionId?: string
}
