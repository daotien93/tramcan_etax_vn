import type { TaxRates, TransactionCategory } from '../types/domain'

export const defaultTaxRates: TaxRates = {
  serviceVat: 0.05,
  servicePit: 0.02,
  tradingVat: 0.01,
  tradingPit: 0.005,
}

export function incomeTaxForLine(
  amount: number,
  category: TransactionCategory,
  rates: TaxRates = defaultTaxRates,
) {
  if (category === 'service') {
    return {
      vat: amount * rates.serviceVat,
      pit: amount * rates.servicePit,
    }
  }
  if (category === 'trading') {
    return {
      vat: amount * rates.tradingVat,
      pit: amount * rates.tradingPit,
    }
  }
  return { vat: 0, pit: 0 }
}
