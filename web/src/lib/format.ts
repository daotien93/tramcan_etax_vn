import dayjs from 'dayjs'

const vnd = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

export function formatVnd(value: number) {
  return vnd.format(Math.round(value))
}

export function formatDate(iso: string) {
  return dayjs(iso).format('DD/MM/YYYY')
}

export function monthKey(iso: string) {
  return dayjs(iso).format('YYYY-MM')
}

export function monthLabel(key: string) {
  return dayjs(`${key}-01`).format('MM/YYYY')
}
