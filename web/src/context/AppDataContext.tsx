import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  BankAccount,
  BusinessProfile,
  DocumentRow,
  InvoiceRow,
  TaxRates,
  Transaction,
} from '../types/domain'
import { defaultTaxRates } from '../lib/tax'

function uid() {
  return crypto.randomUUID()
}

const BANK_1 = uid()
const BANK_2 = uid()
const TX1 = uid()
const TX2 = uid()
const TX3 = uid()
const TX4 = uid()
const TX5 = uid()

function seedBanks(): BankAccount[] {
  return [
    {
      id: BANK_1,
      bankName: 'Vietcombank',
      accountNumber: '0123456789',
      ownerName: 'Nguyễn Văn A',
      isPrimary: true,
    },
    {
      id: BANK_2,
      bankName: 'Techcombank',
      accountNumber: '9988776655',
      ownerName: 'Nguyễn Văn A',
      isPrimary: false,
    },
  ]
}

function seedTransactions(): Transaction[] {
  return [
    {
      id: TX1,
      type: 'income',
      category: 'service',
      amount: 5_000_000,
      paymentMethod: 'bank',
      bankAccountId: BANK_1,
      customerName: 'Công ty CP Logistics Bắc Nam',
      description: 'Dịch vụ cân xe tháng 01/2026',
      transactionDate: '2026-01-18',
    },
    {
      id: TX2,
      type: 'income',
      category: 'trading',
      amount: 12_000_000,
      paymentMethod: 'bank',
      bankAccountId: BANK_1,
      customerName: 'Thu mua phế liệu — anh Hùng',
      description: 'Thanh toán bán phế sắt đợt 2',
      transactionDate: '2026-02-10',
    },
    {
      id: TX3,
      type: 'income',
      category: 'service',
      amount: 25_000_000,
      paymentMethod: 'bank',
      bankAccountId: BANK_1,
      customerName: 'CTY TNHH Thương mại Việt Tín',
      description: 'Thu cân container xuất khẩu',
      transactionDate: '2026-03-05',
    },
    {
      id: TX4,
      type: 'expense',
      category: 'other',
      amount: 2_200_000,
      paymentMethod: 'cash',
      bankAccountId: null,
      customerName: '',
      description: 'Chi mua vật tư văn phòng',
      transactionDate: '2026-03-01',
    },
    {
      id: TX5,
      type: 'income',
      category: 'service',
      amount: 3_000_000,
      paymentMethod: 'bank',
      bankAccountId: BANK_1,
      customerName: 'Khách lẻ',
      description: 'OK',
      transactionDate: '2026-03-22',
    },
  ]
}

/** Chỉ ký hợp đồng cho TX1 — TX3 cố tình không có để demo cảnh báo 20tr */
function seedDocuments(): DocumentRow[] {
  return [
    {
      id: uid(),
      transactionId: TX1,
      docType: 'contract',
      fileUrl: '/vite.svg',
      fileName: 'hop-dong-TX1.pdf',
    },
    {
      id: uid(),
      transactionId: TX2,
      docType: 'invoice',
      fileUrl: '/vite.svg',
      fileName: 'hoadon-TX2.pdf',
    },
  ]
}

function seedInvoices(): InvoiceRow[] {
  return [
    {
      id: uid(),
      transactionId: TX1,
      invoiceNumber: '1K86TYY-001',
      issuedDate: '2026-01-19',
      status: 'issued',
    },
  ]
}

function seedProfile(): BusinessProfile {
  return {
    businessName: 'Hộ kinh doanh Cân xe Trạm Cần',
    taxCode: '0123456789-001',
    ownerName: 'Nguyễn Văn A',
    cccdNumber: '079088001234',
    licenseFileUrl: null,
    licenseFileName: null,
  }
}

type Ctx = {
  businessProfile: BusinessProfile
  setBusinessProfile: (p: Partial<BusinessProfile>) => void
  setLicenseFile: (file: File | null) => void

  bankAccounts: BankAccount[]
  addBankAccount: (b: Omit<BankAccount, 'id' | 'isPrimary'>) => string
  updateBankAccount: (id: string, patch: Partial<BankAccount>) => void
  removeBankAccount: (id: string) => void
  setPrimaryBank: (id: string) => void

  transactions: Transaction[]
  upsertTransaction: (t: Omit<Transaction, 'id'> & { id?: string }) => void
  removeTransaction: (id: string) => void

  documents: DocumentRow[]
  addDocument: (d: { transactionId: string; docType: DocumentRow['docType']; file: File }) => void
  removeDocument: (id: string) => void

  invoices: InvoiceRow[]
  upsertInvoice: (row: Omit<InvoiceRow, 'id'> & { id?: string }) => void

  taxRates: TaxRates
  setTaxRates: (r: Partial<TaxRates>) => void

  /** Demo rule “thu ≠ vào TK”: nhập tổng tiền vào NH kỳ (Settings). null = không kiểm tra. */
  bankInflowMock: number | null
  setBankInflowMock: (v: number | null) => void
}

const AppDataContext = createContext<Ctx | null>(null)

function revokeBlob(url: string | null | undefined) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [businessProfile, setBp] = useState<BusinessProfile>(seedProfile)
  const [bankAccounts, setBanks] = useState<BankAccount[]>(seedBanks)
  const [transactions, setTx] = useState<Transaction[]>(seedTransactions)
  const [documents, setDocs] = useState<DocumentRow[]>(seedDocuments)
  const [invoices, setInv] = useState<InvoiceRow[]>(seedInvoices)
  const [taxRates, setTaxRatesState] = useState<TaxRates>({ ...defaultTaxRates })
  const [bankInflowMock, setBankInflowMock] = useState<number | null>(40_000_000)

  const setBusinessProfile = useCallback((p: Partial<BusinessProfile>) => {
    setBp((prev) => ({ ...prev, ...p }))
  }, [])

  const setLicenseFile = useCallback((file: File | null) => {
    setBp((prev) => {
      revokeBlob(prev.licenseFileUrl)
      if (!file) {
        return { ...prev, licenseFileUrl: null, licenseFileName: null }
      }
      return {
        ...prev,
        licenseFileUrl: URL.createObjectURL(file),
        licenseFileName: file.name,
      }
    })
  }, [])

  const addBankAccount = useCallback((b: Omit<BankAccount, 'id' | 'isPrimary'>) => {
    const id = uid()
    setBanks((prev) => [...prev, { ...b, id, isPrimary: prev.length === 0 }])
    return id
  }, [])

  const updateBankAccount = useCallback((id: string, patch: Partial<BankAccount>) => {
    setBanks((prev) =>
      prev.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    )
  }, [])

  const removeBankAccount = useCallback((id: string) => {
    setBanks((prev) => prev.filter((x) => x.id !== id))
    setTx((prev) =>
      prev.map((t) =>
        t.bankAccountId === id ? { ...t, bankAccountId: null, paymentMethod: 'cash' } : t,
      ),
    )
  }, [])

  const setPrimaryBank = useCallback((id: string) => {
    setBanks((prev) => prev.map((x) => ({ ...x, isPrimary: x.id === id })))
  }, [])

  const upsertTransaction = useCallback(
    (t: Omit<Transaction, 'id'> & { id?: string }) => {
      const id = t.id ?? uid()
      const row: Transaction = {
        id,
        type: t.type,
        category: t.category,
        amount: t.amount,
        paymentMethod: t.paymentMethod,
        bankAccountId: t.paymentMethod === 'bank' ? t.bankAccountId : null,
        customerName: t.customerName,
        description: t.description,
        transactionDate: t.transactionDate,
      }
      setTx((prev) => {
        const i = prev.findIndex((x) => x.id === id)
        if (i === -1) return [...prev, row]
        const next = [...prev]
        next[i] = row
        return next
      })
    },
    [],
  )

  const removeTransaction = useCallback((id: string) => {
    setTx((prev) => prev.filter((x) => x.id !== id))
    setDocs((prev) => {
      prev
        .filter((d) => d.transactionId === id)
        .forEach((d) => revokeBlob(d.fileUrl))
      return prev.filter((d) => d.transactionId !== id)
    })
    setInv((prev) => prev.filter((x) => x.transactionId !== id))
  }, [])

  const addDocument = useCallback(
    (d: { transactionId: string; docType: DocumentRow['docType']; file: File }) => {
      const url = URL.createObjectURL(d.file)
      setDocs((prev) => [
        ...prev,
        {
          id: uid(),
          transactionId: d.transactionId,
          docType: d.docType,
          fileUrl: url,
          fileName: d.file.name,
        },
      ])
    },
    [],
  )

  const removeDocument = useCallback((id: string) => {
    setDocs((prev) => {
      const row = prev.find((x) => x.id === id)
      if (row) revokeBlob(row.fileUrl)
      return prev.filter((x) => x.id !== id)
    })
  }, [])

  const upsertInvoice = useCallback(
    (row: Omit<InvoiceRow, 'id'> & { id?: string }) => {
      const id = row.id ?? uid()
      const next: InvoiceRow = {
        id,
        transactionId: row.transactionId,
        invoiceNumber: row.invoiceNumber,
        issuedDate: row.issuedDate,
        status: row.status,
      }
      setInv((prev) => {
        const i = prev.findIndex((x) => x.id === id)
        if (i === -1) return [...prev, next]
        const cp = [...prev]
        cp[i] = next
        return cp
      })
    },
    [],
  )

  const setTaxRates = useCallback((r: Partial<TaxRates>) => {
    setTaxRatesState((prev) => ({ ...prev, ...r }))
  }, [])

  const value = useMemo<Ctx>(
    () => ({
      businessProfile,
      setBusinessProfile,
      setLicenseFile,
      bankAccounts,
      addBankAccount,
      updateBankAccount,
      removeBankAccount,
      setPrimaryBank,
      transactions,
      upsertTransaction,
      removeTransaction,
      documents,
      addDocument,
      removeDocument,
      invoices,
      upsertInvoice,
      taxRates,
      setTaxRates,
      bankInflowMock,
      setBankInflowMock,
    }),
    [
      businessProfile,
      setBusinessProfile,
      setLicenseFile,
      bankAccounts,
      addBankAccount,
      updateBankAccount,
      removeBankAccount,
      setPrimaryBank,
      transactions,
      upsertTransaction,
      removeTransaction,
      documents,
      addDocument,
      removeDocument,
      invoices,
      upsertInvoice,
      taxRates,
      setTaxRates,
      bankInflowMock,
    ],
  )

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  )
}

export function useAppData() {
  const c = useContext(AppDataContext)
  if (!c) throw new Error('useAppData must be used within AppDataProvider')
  return c
}
