import { format } from "date-fns"

export const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

export function formatPKR(amount: number) {
  const value = Number.isFinite(amount) ? amount : 0
  return `PKR ${new Intl.NumberFormat("en-PK").format(Math.round(value))}`
}

export function formatDate(date: Date | string) {
  return format(new Date(date), "dd MMM yyyy")
}

export function getConsecutiveMissedMonths(paidMonths: number[], currentMonth: number) {
  let missed = 0
  for (let m = currentMonth; m >= 1; m -= 1) {
    if (paidMonths.includes(m)) {
      break
    }
    missed += 1
  }
  return missed
}

export function monthStatusForYear(
  month: number,
  year: number,
  paymentsByMonth: Map<number, { amount: number; paymentDate: Date; paymentId: string }>,
  monthlyAmount: number
) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const payment = paymentsByMonth.get(month)
  if (payment) {
    return {
      month,
      monthName: MONTH_NAMES[month - 1],
      status: "paid" as const,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      paymentId: payment.paymentId,
    }
  }

  const isPast = year < currentYear || (year === currentYear && month < currentMonth)
  return {
    month,
    monthName: MONTH_NAMES[month - 1],
    status: (isPast ? "missed" : "pending") as "missed" | "pending",
    amount: monthlyAmount,
    paymentDate: null,
    paymentId: null,
  }
}
